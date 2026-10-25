export type CapturePhase =
  'idle' | 'starting' | 'recording' | 'paused' | 'stopping' | 'stopped';
export type CaptureSnapshot = {
  phase: CapturePhase;
  elapsedMs: number;
  blob: Blob | null;
  error: string | null;
};
export type Recorder = {
  state: RecordingState;
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: (() => void) | null;
  start: (timeslice: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
};
export type CaptureEnvironment = {
  secureContext: boolean;
  supported: boolean;
  supportsType: (type: string) => boolean;
  getStream: () => Promise<MediaStream>;
  createRecorder: (stream: MediaStream, mimeType: string) => Recorder;
  now: () => number;
};

export function chooseRecordingMime(supports: (type: string) => boolean) {
  return (
    [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/webm',
      'audio/ogg',
    ].find(supports) ?? null
  );
}

export function microphoneError(error: unknown) {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Microphone permission is blocked. Allow microphone access in your browser settings, then try again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'No available microphone was found. Connect a microphone and try again.';
  if (name === 'NotReadableError' || name === 'AbortError')
    return 'The microphone is unavailable. Close another app using it and try again.';
  return 'Unable to start the microphone. Check your browser and microphone settings, then try again.';
}

export function browserCaptureEnvironment(): CaptureEnvironment {
  return {
    secureContext: window.isSecureContext,
    supported:
      typeof MediaRecorder !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia,
    supportsType: (type) => MediaRecorder.isTypeSupported(type),
    getStream: () =>
      navigator.mediaDevices.getUserMedia({ audio: true, video: false }),
    createRecorder: (stream, mimeType) =>
      new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 96_000,
      }) as unknown as Recorder,
    now: () => performance.now(),
  };
}

// A bounded, in-memory recording. Paused wall time never counts as audio time.
export class BrowserRecordingSession {
  snapshot: CaptureSnapshot = {
    phase: 'idle',
    elapsedMs: 0,
    blob: null,
    error: null,
  };
  private environment: CaptureEnvironment;
  private changed: (state: CaptureSnapshot) => void;
  private recorder: Recorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private bytes = 0;
  private byteLimit = 64 * 1024 * 1024;
  private durationLimit = 0;
  private elapsed = 0;
  private activeSince = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;
  private generation = 0;

  constructor(
    environment: CaptureEnvironment,
    changed: (state: CaptureSnapshot) => void,
  ) {
    this.environment = environment;
    this.changed = changed;
  }

  private publish(patch: Partial<CaptureSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    if (!this.disposed) this.changed(this.snapshot);
  }

  async start(maxDurationSeconds: number, maxBytes = 64 * 1024 * 1024) {
    if (this.disposed || !['idle', 'stopped'].includes(this.snapshot.phase))
      return;
    if (!Number.isSafeInteger(maxDurationSeconds) || maxDurationSeconds <= 0) {
      this.publish({
        error: 'The recording policy is unavailable. Please retry.',
      });
      return;
    }
    if (!this.environment.secureContext) {
      this.publish({
        error: 'Microphone recording requires HTTPS or localhost.',
      });
      return;
    }
    if (!this.environment.supported) {
      this.publish({
        error:
          'This browser does not support audio recording. Use a current Chrome, Firefox, Edge or Safari browser, or upload an audio file.',
      });
      return;
    }
    const mime = chooseRecordingMime(this.environment.supportsType);
    if (!mime) {
      this.publish({
        error:
          'This browser cannot record a supported audio format. Try another browser or upload an audio file.',
      });
      return;
    }
    this.durationLimit = maxDurationSeconds * 1000;
    this.byteLimit = maxBytes;
    this.chunks = [];
    this.bytes = this.elapsed = 0;
    this.publish({ phase: 'starting', error: null, elapsedMs: 0, blob: null });
    const generation = ++this.generation;
    try {
      const stream = await this.environment.getStream();
      if (this.disposed || generation !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      stream
        .getTracks()
        .forEach((track) => track.addEventListener('ended', this.interrupted));
      const recorder = this.environment.createRecorder(stream, mime);
      this.recorder = recorder;
      recorder.ondataavailable = ({ data }) => {
        if (this.disposed || !data.size) return;
        if (this.bytes + data.size > this.byteLimit) {
          this.publish({
            error:
              'Recording stopped at the browser memory limit. Save the audio captured so far.',
          });
          this.stop();
          return;
        }
        this.chunks.push(data);
        this.bytes += data.size;
      };
      recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: recorder.mimeType || mime });
        this.chunks = [];
        this.releaseStream();
        this.clearTimer();
        this.publish({
          phase: 'stopped',
          blob: blob.size ? blob : null,
          error: blob.size
            ? this.snapshot.error
            : 'No audio was captured. Check your microphone and record again.',
        });
      };
      recorder.onerror = this.interrupted;
      recorder.start(1000);
      this.activeSince = this.environment.now();
      this.publish({ phase: 'recording' });
      this.timer = setInterval(() => this.tick(), 250);
    } catch (error) {
      this.releaseStream();
      this.clearTimer();
      this.publish({ phase: 'idle', error: microphoneError(error) });
    }
  }

  tick() {
    if (this.snapshot.phase !== 'recording') return;
    const elapsedMs = Math.min(
      this.durationLimit,
      this.elapsed + Math.max(0, this.environment.now() - this.activeSince),
    );
    this.publish({ elapsedMs });
    if (elapsedMs >= this.durationLimit) {
      this.publish({
        error:
          'Recording stopped at the recording duration limit. Your audio is ready to save.',
      });
      this.stop();
    }
  }

  pause() {
    if (this.snapshot.phase !== 'recording') return;
    this.tick();
    if (this.snapshot.phase !== 'recording') return;
    this.recorder?.pause();
    this.elapsed = this.snapshot.elapsedMs;
    this.publish({ phase: 'paused' });
  }

  resume() {
    if (this.snapshot.phase !== 'paused') return;
    this.recorder?.resume();
    this.activeSince = this.environment.now();
    this.publish({ phase: 'recording' });
  }

  stop() {
    if (!['recording', 'paused'].includes(this.snapshot.phase)) return;
    if (this.snapshot.phase === 'recording') {
      this.elapsed = Math.min(
        this.durationLimit,
        this.elapsed + Math.max(0, this.environment.now() - this.activeSince),
      );
    }
    this.publish({ phase: 'stopping', elapsedMs: this.elapsed });
    this.clearTimer();
    if (this.recorder?.state !== 'inactive') this.recorder?.stop();
    else this.recorder?.onstop?.();
  }

  private interrupted = () => {
    this.publish({
      error:
        'Microphone recording was interrupted. Save the audio captured so far, then check your microphone.',
    });
    this.stop();
  };

  private clearTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private releaseStream() {
    this.stream?.getTracks().forEach((track) => {
      track.removeEventListener('ended', this.interrupted);
      track.stop();
    });
    this.stream = null;
  }

  dispose() {
    this.disposed = true;
    this.generation++;
    this.clearTimer();
    if (this.recorder) {
      this.recorder.ondataavailable =
        this.recorder.onstop =
        this.recorder.onerror =
          null;
      if (this.recorder.state !== 'inactive') this.recorder.stop();
    }
    this.releaseStream();
    this.chunks = [];
    this.snapshot = { phase: 'idle', elapsedMs: 0, blob: null, error: null };
  }
}

export function recordingTime(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
