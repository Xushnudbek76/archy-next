import type { TutorMessage } from '@/libs/types/tutor';
import type { StudySource } from '@/libs/types/study';
import { SourceLinks } from '@/libs/components/study/SourceLinks';
export function TutorMessages({
  messages,
  onSource,
}: {
  messages: TutorMessage[];
  onSource: (source: StudySource) => void;
}) {
  return (
    <div className="tutor-messages" aria-label="Conversation messages">
      {messages.map((message) => (
        <article className={`tutor-message ${message.role}`} key={message.id}>
          <strong>{message.role === 'user' ? 'You' : 'Archy tutor'}</strong>
          <p>{message.text}</p>
          {message.provider === 'fixture' ? (
            <p className="muted">Synthetic test fixture.</p>
          ) : null}
          {message.sources.length ? (
            <div>
              <p className="muted">
                Answer sources · passages supplied to the tutor
              </p>
              <SourceLinks
                ids={message.sources.map((source) => source.id)}
                sources={message.sources}
                onSelect={onSource}
              />
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
