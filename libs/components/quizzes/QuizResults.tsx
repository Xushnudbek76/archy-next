'use client';
import { useDemo } from '@/libs/hooks/useDemo';

import { useEffect, useRef, useState } from 'react';
import { quizError, retryQuiz } from '@/api/quizzes-client';
import type { Quiz, QuizAttempt } from '@/libs/types/quizzes';
import type { StudySource } from '@/libs/types/study';
import { SourceLinks } from '@/libs/components/study/SourceLinks';
import { quizResultRows, quizScore } from './quiz-results';

export function QuizResults({
  quiz,
  attempt,
  sources,
  onSource,
  onRetry,
  onAgain,
}: {
  quiz: Quiz;
  attempt: QuizAttempt;
  sources: StudySource[];
  onSource: (source: StudySource) => void;
  onRetry: (quiz: Quiz) => void;
  onAgain: () => void;
}) {
  const readOnly = useDemo();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const score = quizScore(attempt);
  const rows = quizResultRows(quiz, attempt);
  async function retry() {
    if (request.current) return;
    const abort = new AbortController();
    request.current = abort;
    setPending(true);
    setError('');
    try {
      const result = await retryQuiz(quiz, attempt, abort.signal);
      if (!abort.signal.aborted) onRetry(result);
    } catch (cause) {
      if (!abort.signal.aborted) setError(quizError(cause));
    } finally {
      request.current = null;
      if (!abort.signal.aborted) setPending(false);
    }
  }
  return (
    <section className="quiz-results" aria-label="Quiz results">
      <h3>Quiz results</h3>
      <p className="quiz-score" role="status">
        {score.correct} of {score.total} correct · {score.percent}%
      </p>
      <p>Completed {new Date(attempt.createdAt).toLocaleString()}</p>
      <div className="quiz-actions">
        {score.mistakes ? (
          <button
            type="button"
            className="primary-button"
            disabled={readOnly || pending}
            onClick={() => void retry()}
          >
            {pending
              ? 'Opening mistakes…'
              : `Retry ${score.mistakes} incorrect ${score.mistakes === 1 ? 'question' : 'questions'}`}
          </button>
        ) : (
          <p>Every answer was correct. There are no mistakes to retry.</p>
        )}
        <button
          type="button"
          className="secondary-button"
          disabled={readOnly || pending}
          onClick={onAgain}
        >
          Take this quiz again
        </button>
      </div>
      {error ? (
        <p role="alert" className="course-error">
          {error}
        </p>
      ) : null}
      <ol className="quiz-result-list">
        {rows.map((row) => (
          <li
            key={row.questionId}
            className={row.correct ? 'correct' : 'incorrect'}
          >
            <h4>{row.prompt}</h4>
            <p className="quiz-result-state">
              {row.correct ? 'Correct' : 'Incorrect'}
            </p>
            <p>
              <strong>Your answer:</strong> {row.selected}
            </p>
            {!row.correct ? (
              <p>
                <strong>Correct answer:</strong> {row.expected}
              </p>
            ) : null}
            <p>{row.explanation}</p>
            <SourceLinks
              ids={row.sourceIds}
              sources={sources}
              onSelect={onSource}
            />
            {row.sourceIds.some(
              (id) => !sources.some((source) => source.id === id),
            ) ? (
              <p className="course-caption">
                Some source references are no longer available in the current
                material.
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
