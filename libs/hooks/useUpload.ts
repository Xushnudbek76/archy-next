'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/api/json-client';
import {
  cancelUpload,
  createUpload,
  hashFile,
  isTerminalUploadError,
  recordingError,
  transferUpload,
} from '@/api/recordings-client';
import type { Upload } from '@/libs/types/recordings';

export function useUpload(onChange: () => void) {
  const [phase, setPhase] = useState<
    'idle' | 'hashing' | 'uploading' | 'finishing' | 'paused' | 'done'
  >('idle');
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(1);
  const [current, setCurrent] = useState<Upload | null>(null);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const fileRef = useRef<File | null>(null);
  const admission = useRef<Parameters<typeof createUpload>[0] | null>(null);
  const busy = useRef(false);
  const router = useRouter();
  useEffect(() => () => controller.current?.abort(), []);

  async function run(
    file: File,
    courseId?: string,
    title?: string,
    existing?: Upload,
  ): Promise<boolean> {
    if (busy.current) return false;
    if (
      !file.size ||
      !Number.isSafeInteger(file.size) ||
      (!existing &&
        (!courseId || !title?.trim() || [...title.trim()].length > 100))
    ) {
      setError(
        'Choose a course, a title between 1 and 100 characters, and a nonempty audio file.',
      );
      return false;
    }
    busy.current = true;
    const abort = new AbortController();
    controller.current = abort;
    fileRef.current = file;
    setError('');
    setPhase('hashing');
    setProgress(0);
    setTotal(file.size);
    setCurrent(existing ?? null);
    try {
      const checksum = await hashFile(file, abort.signal, setProgress);
      if (
        existing &&
        (checksum !== existing.sha256 || file.size !== existing.sizeBytes)
      )
        throw new ApiError(400, 'wrong_file', 'Select the original file.');
      let upload = existing;
      if (!upload) {
        const previous = admission.current;
        const payload = {
          id:
            previous &&
            previous.sha256 === checksum &&
            previous.courseId === courseId &&
            previous.title === title!.trim() &&
            previous.fileName === file.name
              ? previous.id
              : crypto.randomUUID(),
          courseId: courseId!,
          title: title!.trim(),
          fileName: file.name,
          sizeBytes: file.size,
          sha256: checksum,
        };
        admission.current = payload;
        upload = await createUpload(payload, abort.signal);
      }
      setCurrent(upload);
      setPhase('uploading');
      setProgress(upload.uploadedBytes);
      const result = await transferUpload(
        file,
        upload,
        abort.signal,
        (bytes, saved) => {
          setProgress(bytes);
          if (saved) {
            setCurrent(saved);
            if (saved.uploadedBytes === saved.sizeBytes) setPhase('finishing');
          }
        },
      );
      setCurrent(result);
      setPhase('done');
      admission.current = null;
      fileRef.current = null;
      return true;
    } catch (cause) {
      const terminal = isTerminalUploadError(cause);
      setPhase(terminal ? 'idle' : 'paused');
      if (terminal) {
        setCurrent(null);
        fileRef.current = null;
        admission.current = null;
      }
      if (!abort.signal.aborted) setError(recordingError(cause));
      if (cause instanceof ApiError && [401, 403].includes(cause.status)) {
        router.replace('/login?next=%2Frecordings');
        router.refresh();
      }
      return false;
    } finally {
      busy.current = false;
      controller.current = null;
      onChange();
    }
  }
  async function cancel(upload: Upload) {
    if (busy.current) return;
    busy.current = true;
    setError('');
    try {
      await cancelUpload(upload.id);
      if (admission.current?.id === upload.id) admission.current = null;
      if (current?.id === upload.id) {
        setCurrent(null);
        fileRef.current = null;
        setPhase('idle');
      }
      onChange();
    } catch (cause) {
      setError(recordingError(cause));
    } finally {
      busy.current = false;
    }
  }
  const pending = ['hashing', 'uploading', 'finishing'].includes(phase);
  return {
    phase,
    progress,
    total,
    current,
    error,
    pending,
    start: (file: File, courseId: string, title: string) =>
      run(file, courseId, title),
    resume: (upload: Upload, file: File) =>
      run(file, undefined, undefined, upload),
    resumeCurrent: () =>
      current && fileRef.current
        ? run(fileRef.current, undefined, undefined, current)
        : Promise.resolve(false),
    canResume: Boolean(current && phase === 'paused'),
    pause: () => controller.current?.abort(),
    cancel,
  };
}
