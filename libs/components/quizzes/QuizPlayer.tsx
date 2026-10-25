'use client';

import { useEffect, useReducer, useRef } from 'react';
import { quizError, submitQuizAttempt } from '@/api/quizzes-client';
import type { Quiz } from '@/libs/types/quizzes';
import {
  initialQuizSession,
  quizAnswers,
  quizSessionReducer,
} from './quiz-session';

export function QuizPlayer({
  quiz,
  onBack,
}: {
  quiz: Quiz;
  onBack: () => void;
}) {
  const [state, dispatch] = useReducer(
    quizSessionReducer,
    quiz,
    initialQuizSession,
  );
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
      if (!abort.signal.aborted)
        dispatch({ type: 'completed', quizId: quiz.id, attempt });
    } catch (cause) {
      if (!abort.signal.aborted)
        dispatch({ type: 'failed', quizId: quiz.id, error: quizError(cause) });
    } finally {
      controller.current = null;
    }
  }
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
      {state.attempt ? (
        <p role="status">
          Answers submitted. {state.attempt.score} of {state.attempt.total}{' '}
          correct.
        </p>
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
      {state.error ? (
        <p role="alert" className="course-error">
          {state.error} Your selected answers are kept for retry.
        </p>
      ) : null}
    </section>
  );
}
