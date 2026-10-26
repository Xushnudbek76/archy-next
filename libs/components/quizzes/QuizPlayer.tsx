'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import {
  listQuizAttempts,
  quizError,
  submitQuizAttempt,
} from '@/api/quizzes-client';
import type { Quiz, QuizAttempt } from '@/libs/types/quizzes';
import type { StudySource } from '@/libs/types/study';
import { QuizResults } from './QuizResults';
import {
  initialQuizSession,
  quizAnswers,
  quizSessionReducer,
} from './quiz-session';

export function QuizPlayer({
  quiz,
  onBack,
  sources,
  onSource,
  onRetry,
}: {
  quiz: Quiz;
  onBack: () => void;
  sources: StudySource[];
  onSource: (source: StudySource) => void;
  onRetry: (quiz: Quiz) => void;
}) {
  const [state, dispatch] = useReducer(
    quizSessionReducer,
    quiz,
    initialQuizSession,
  );
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);
  const [reviewed, setReviewed] = useState<QuizAttempt | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [historyRevision, setHistoryRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    listQuizAttempts(quiz, abort.signal)
      .then((items) => {
        if (!abort.signal.aborted) {
          setAttempts(items);
          setHistoryError('');
        }
      })
      .catch((cause) => {
        if (!abort.signal.aborted) setHistoryError(quizError(cause));
      });
    return () => abort.abort();
  }, [quiz, historyRevision]);
  const controller = useRef<AbortController | null>(null);
  const dirty = Object.keys(state.answers).length > 0 && !state.attempt;
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!dirty) return;
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [dirty]);
  async function submit() {
    if (controller.current || state.attempt) return;
    let answers;
    try {
      answers = quizAnswers(quiz, state.answers);
    } catch {
      dispatch({ type: 'submitting' });
      return;
    }
    if (!window.confirm(`Submit all ${answers.length} answers for scoring?`))
      return;
    const abort = new AbortController();
    controller.current = abort;
    dispatch({ type: 'submitting' });
    try {
      const attempt = await submitQuizAttempt(quiz, answers, abort.signal);
      if (!abort.signal.aborted) {
        dispatch({ type: 'completed', quizId: quiz.id, attempt });
        setReviewed(attempt);
        setAttempts((items) =>
          [
            attempt,
            ...(items ?? []).filter((item) => item.id !== attempt.id),
          ].slice(0, 100),
        );
        setHistoryRevision((value) => value + 1);
      }
    } catch (cause) {
      if (!abort.signal.aborted)
        dispatch({ type: 'failed', quizId: quiz.id, error: quizError(cause) });
    } finally {
      controller.current = null;
    }
  }
  const displayed = reviewed ?? state.attempt;
  const question = quiz.questions[state.index]!;
  const answered = Object.keys(state.answers).length;
  return (
    <section className="quiz-player" aria-label="Study quiz">
      <button
        type="button"
        className="secondary-button"
        disabled={state.pending}
        onClick={() => {
          if (
            !dirty ||
            window.confirm(
              'Leave this quiz? Your unsubmitted answers will be lost.',
            )
          )
            onBack();
        }}
      >
        Back to quizzes
      </button>
      <h2>{quiz.title}</h2>
      {quiz.provider === 'fixture' ? (
        <p className="course-caption">Test fixture questions</p>
      ) : null}
      {displayed ? (
        <QuizResults
          key={displayed.id}
          quiz={quiz}
          attempt={displayed}
          sources={sources}
          onSource={onSource}
          onRetry={onRetry}
          onAgain={() => {
            setReviewed(null);
            dispatch({ type: 'reset' });
          }}
        />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <p>
            Question {state.index + 1} of {quiz.questions.length} · {answered}{' '}
            answered
          </p>
          <nav className="quiz-question-nav" aria-label="Quiz questions">
            {quiz.questions.map((item, index) => (
              <button
                type="button"
                key={item.id}
                disabled={state.pending}
                aria-current={state.index === index ? 'step' : undefined}
                aria-label={`Question ${index + 1}${state.answers[item.id] !== undefined ? ', answered' : ', unanswered'}`}
                onClick={() => dispatch({ type: 'move', index })}
              >
                {index + 1}
                {state.answers[item.id] !== undefined ? ' ✓' : ''}
              </button>
            ))}
          </nav>
          <fieldset disabled={state.pending} className="quiz-question">
            <legend>{question.prompt}</legend>
            {question.options.map((option, index) => (
              <label
                key={index}
                className={
                  state.answers[question.id] === index ? 'selected' : ''
                }
              >
                <input
                  type="radio"
                  name={`quiz-${quiz.id}-${question.id}`}
                  value={index}
                  checked={state.answers[question.id] === index}
                  onChange={() =>
                    dispatch({
                      type: 'answer',
                      questionId: question.id,
                      answer: index,
                    })
                  }
                />
                {option}
              </label>
            ))}
          </fieldset>
          <div className="quiz-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={state.pending || state.index === 0}
              onClick={() => dispatch({ type: 'move', index: state.index - 1 })}
            >
              Previous question
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={
                state.pending || state.index === quiz.questions.length - 1
              }
              onClick={() => dispatch({ type: 'move', index: state.index + 1 })}
            >
              Next question
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={state.pending || answered !== quiz.questions.length}
            >
              {state.pending ? 'Submitting answers…' : 'Submit answers'}
            </button>
          </div>
          {answered !== quiz.questions.length ? (
            <p className="course-caption">Answer every question to submit.</p>
          ) : null}
        </form>
      )}
      <section className="quiz-attempts" aria-label="Saved quiz attempts">
        <div className="quiz-heading">
          <h3>Saved attempts</h3>
          <button
            type="button"
            className="secondary-button"
            disabled={state.pending}
            onClick={() => setHistoryRevision((value) => value + 1)}
          >
            Refresh attempts
          </button>
        </div>
        {historyError ? (
          <p role="alert">{historyError}</p>
        ) : attempts === null ? (
          <p role="status">Loading attempts…</p>
        ) : attempts.length === 0 ? (
          <p>No completed attempts yet.</p>
        ) : (
          <ul>
            {attempts.map((attempt) => (
              <li key={attempt.id}>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={state.pending}
                  onClick={() => {
                    if (
                      !dirty ||
                      window.confirm(
                        'Review this attempt? Your unsubmitted answers will be lost.',
                      )
                    ) {
                      dispatch({ type: 'reset' });
                      setReviewed(attempt);
                    }
                  }}
                >
                  {attempt.score} / {attempt.total} ·{' '}
                  {new Date(attempt.createdAt).toLocaleString()}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {state.error ? (
        <p role="alert" className="course-error">
          {state.error} Your selected answers are kept for retry.
        </p>
      ) : null}
    </section>
  );
}
