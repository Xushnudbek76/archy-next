'use client';
import { useStudyReadOnly } from '@/libs/components/study/StudyAccess';
import { useEffect, useRef, useState } from 'react';
import {
  conversation,
  conversations,
  createConversation,
} from '@/api/tutor-client';
import { studyError } from '@/api/study-client';
import type { Conversation, ConversationDetail } from '@/libs/types/tutor';
import type { StudyLanguage, StudySource } from '@/libs/types/study';
import { TutorMessages } from './TutorMessages';
import { sendTutorMessage } from '@/api/tutor-stream-client';
export function DocumentTutor({
  documentId,
  onSource,
}: {
  documentId: string;
  onSource: (source: StudySource) => void;
}) {
  const readOnly = useStudyReadOnly();
  const [items, setItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState('');
  const [language, setLanguage] = useState<StudyLanguage>('en');
  const [sending, setSending] = useState(false);
  const [partial, setPartial] = useState('');
  const controller = useRef<AbortController | null>(null);
  const historyRead = useRef<AbortController | null>(null);
  const request = useRef<{
    id: string;
    text: string;
    language: StudyLanguage;
    conversation: string;
  } | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (controller.current || !selected || !draft.trim()) return;
    historyRead.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setSending(true);
    setError('');
    setPartial('');
    const text = draft.trim();
    if (
      !request.current ||
      request.current.text !== text ||
      request.current.language !== language ||
      request.current.conversation !== selected
    )
      request.current = {
        id: crypto.randomUUID(),
        text,
        language,
        conversation: selected,
      };
    try {
      await sendTutorMessage(
        selected,
        text,
        language,
        request.current.id,
        abort.signal,
        (event) => {
          if (event.type === 'delta') setPartial((old) => old + event.text);
        },
      );
      const saved = await conversation(selected, abort.signal);
      if (!abort.signal.aborted) {
        setDetail(saved);
        setPartial('');
        setDraft('');
        request.current = null;
      }
    } catch (cause) {
      setError(
        abort.signal.aborted
          ? 'Answer stopped. The partial reply is incomplete. You can retry the question.'
          : cause instanceof Error
            ? cause.message
            : 'The response was interrupted. Retry the question.',
      );
    } finally {
      controller.current = null;
      setSending(false);
    }
  }
  useEffect(() => {
    const abort = new AbortController();
    conversations(documentId, abort.signal).then(
      (value) => {
        if (!abort.signal.aborted) {
          setItems(value);
          setSelected((current) => current || value[0]?.id || '');
          setLoading(false);
          setError('');
        }
      },
      (cause) => {
        if (!abort.signal.aborted) {
          setError(studyError(cause));
          setLoading(false);
        }
      },
    );
    return () => abort.abort();
  }, [documentId, revision]);
  useEffect(() => {
    if (!selected) return;
    const abort = new AbortController();
    historyRead.current = abort;
    conversation(selected, abort.signal).then(
      (value) => {
        if (!abort.signal.aborted) {
          setDetail(value);
          setError('');
        }
      },
      (cause) => {
        if (!abort.signal.aborted) setError(studyError(cause));
      },
    );
    return () => abort.abort();
  }, [selected, revision]);
  async function create() {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const value = await createConversation(documentId);
      setItems((old) => [value, ...old]);
      setSelected(value.id);
      setDetail(null);
      setPartial('');
      setDraft('');
      request.current = null;
    } catch (cause) {
      setError(studyError(cause));
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="document-tutor" aria-label="AI tutor">
      <h2>AI tutor</h2>
      <p>
        Ask questions about this document. Answers use selected passages from
        your material.
      </p>
      <div className="study-controls">
        <button
          className="secondary-button"
          disabled={readOnly || pending || sending || loading}
          onClick={() => void create()}
        >
          {pending ? 'Opening conversation…' : 'New conversation'}
        </button>
        {items.length ? (
          <label>
            Conversation
            <select
              value={selected}
              disabled={readOnly || sending}
              onChange={(e) => {
                setSelected(e.target.value);
                setDetail(null);
                setPartial('');
                setError('');
                setDraft('');
                request.current = null;
              }}
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {new Date(item.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {error ? (
        <p role="alert">
          {error}{' '}
          <button
            disabled={readOnly || sending}
            onClick={() => setRevision((n) => n + 1)}
          >
            Reload conversations
          </button>
        </p>
      ) : null}
      {detail?.id === selected ? (
        <TutorMessages messages={detail.messages} onSource={onSource} />
      ) : null}
      {partial ? (
        <article className="tutor-message" aria-busy={sending}>
          <strong>
            {sending
              ? 'Archy tutor is replying…'
              : 'Incomplete reply — not saved'}
          </strong>
          <p>{partial}</p>
        </article>
      ) : null}
      {selected && detail?.id === selected ? (
        <form className="tutor-form" onSubmit={(event) => void send(event)}>
          <label htmlFor={`tutor-question-${documentId}`}>Your question</label>
          <textarea
            id={`tutor-question-${documentId}`}
            value={draft}
            maxLength={2000}
            disabled={readOnly || sending}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Explain a concept from this material…"
          />
          <div className="study-controls">
            <label>
              Answer language
              <select
                value={language}
                disabled={readOnly || sending}
                onChange={(event) =>
                  setLanguage(event.target.value as StudyLanguage)
                }
              >
                <option value="en">English</option>
                <option value="ko">한국어</option>
              </select>
            </label>
            <button
              className="primary-button"
              disabled={readOnly || sending || !draft.trim()}
            >
              {sending ? 'Preparing answer…' : 'Ask tutor'}
            </button>
            {sending ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => controller.current?.abort()}
              >
                Stop answer
              </button>
            ) : null}
          </div>
          <p className="muted">
            AI-generated answers may contain mistakes. Check the original
            material.
          </p>
        </form>
      ) : null}
      {loading ? (
        <p role="status">Loading conversations…</p>
      ) : !items.length ? (
        <p>Start a conversation to study with the tutor.</p>
      ) : null}
    </section>
  );
}
