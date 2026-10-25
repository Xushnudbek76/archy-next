'use client';
import { useEffect, useState } from 'react';
import {
  conversation,
  conversations,
  createConversation,
} from '@/api/tutor-client';
import { studyError } from '@/api/study-client';
import type { Conversation, ConversationDetail } from '@/libs/types/tutor';
export function DocumentTutor({ documentId }: { documentId: string }) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
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
          disabled={pending}
          onClick={() => void create()}
        >
          {pending ? 'Opening conversation…' : 'New conversation'}
        </button>
        {items.length ? (
          <label>
            Conversation
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setDetail(null);
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
          <button onClick={() => setRevision((n) => n + 1)}>
            Reload conversations
          </button>
        </p>
      ) : null}
      {loading ? (
        <p role="status">Loading conversations…</p>
      ) : !items.length ? (
        <p>Start a conversation to study with the tutor.</p>
      ) : null}
      {detail?.id === selected ? (
        <div className="tutor-messages" aria-label="Conversation messages">
          {detail.messages.map((message) => (
            <article
              className={`tutor-message ${message.role}`}
              key={message.id}
            >
              <strong>{message.role === 'user' ? 'You' : 'Archy tutor'}</strong>
              <p>{message.text}</p>
              {message.provider === 'fixture' ? (
                <p className="muted">Synthetic test fixture.</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
