'use client';

import { useEffect, useRef, useState } from 'react';
import { QuizPlayer } from './QuizPlayer';
import { createQuiz, listQuizzes, quizError } from '@/api/quizzes-client';
import type { Quiz, QuizSettings } from '@/libs/types/quizzes';
import type { StudySource } from '@/libs/types/study';

type Props = {
  documentId: string;
  sources: StudySource[];
  onSource: (source: StudySource) => void;
};
export function DocumentQuizzes(props: Props) {
  return <QuizDocument key={props.documentId} {...props} />;
}
function QuizDocument({ documentId }: Props) {
  const [settings, setSettings] = useState<QuizSettings>({
    questionType: 'mixed',
    questionCount: 5,
    language: 'en',
  });
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [selected, setSelected] = useState<Quiz | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  const generation = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    listQuizzes(documentId, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setQuizzes(items);
          setError('');
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(quizError(cause));
      });
    return () => controller.abort();
  }, [documentId, revision]);
  useEffect(() => () => generation.current?.abort(), []);
  async function generate() {
    if (generation.current) return;
    const controller = new AbortController();
    generation.current = controller;
    setPending(true);
    setError('');
    try {
      const quiz = await createQuiz(documentId, settings, controller.signal);
      if (!controller.signal.aborted) {
        setQuizzes((items) =>
          [quiz, ...(items ?? []).filter((item) => item.id !== quiz.id)].slice(
            0,
            50,
          ),
        );
        setSelected(quiz);
        setRevision((value) => value + 1);
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(quizError(cause));
    } finally {
      generation.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }
  if (selected)
    return (
      <QuizPlayer
        key={selected.id}
        quiz={selected}
        onBack={() => setSelected(null)}
      />
    );
  return (
    <section className="document-quizzes" aria-label="Document quizzes">
      <h2>Study quizzes</h2>
      <p>Practice with questions grounded in this document.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void generate();
        }}
      >
        <fieldset disabled={pending} className="quiz-setup">
          <legend>Create a quiz</legend>
          <label>
            Question type
            <select
              value={settings.questionType}
              onChange={(event) =>
                setSettings((value) => ({
                  ...value,
                  questionType: event.target
                    .value as QuizSettings['questionType'],
                }))
              }
            >
              <option value="mixed">Mixed</option>
              <option value="multiple_choice">Multiple choice</option>
              <option value="true_false">True or false</option>
            </select>
          </label>
          <label>
            Number of questions
            <select
              value={settings.questionCount}
              onChange={(event) =>
                setSettings((value) => ({
                  ...value,
                  questionCount: Number(
                    event.target.value,
                  ) as QuizSettings['questionCount'],
                }))
              }
            >
              <option value={5}>5 questions</option>
              <option value={10}>10 questions</option>
              <option value={15}>15 questions</option>
            </select>
          </label>
          <label>
            Quiz language
            <select
              value={settings.language}
              onChange={(event) =>
                setSettings((value) => ({
                  ...value,
                  language: event.target.value as QuizSettings['language'],
                }))
              }
            >
              <option value="en">English</option>
              <option value="ko">한국어</option>
            </select>
          </label>
          <button className="primary-button" type="submit">
            {pending ? 'Generating quiz…' : 'Generate quiz'}
          </button>
        </fieldset>
      </form>
      {pending ? (
        <p role="status">Creating questions from your material…</p>
      ) : null}
      {error ? (
        <p role="alert" className="course-error">
          {error}
        </p>
      ) : null}
      <div className="quiz-heading">
        <h3>Saved quizzes</h3>
        <button
          type="button"
          className="secondary-button"
          disabled={pending}
          onClick={() => setRevision((value) => value + 1)}
        >
          Refresh quizzes
        </button>
      </div>
      {quizzes === null ? (
        <p role="status">
          {error ? 'Saved quizzes could not be loaded.' : 'Loading quizzes…'}
        </p>
      ) : quizzes.length === 0 ? (
        <p>
          No quizzes yet. Add readable material, then generate your first quiz.
        </p>
      ) : (
        <ul className="quiz-history">
          {quizzes.map((quiz) => (
            <li key={quiz.id}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelected(quiz)}
              >
                {quiz.title}
              </button>
              <span>
                {quiz.questions.length} questions ·{' '}
                {quiz.language === 'ko' ? '한국어' : 'English'} ·{' '}
                {new Date(quiz.createdAt).toLocaleDateString()}
                {quiz.provider === 'fixture' ? ' · Test fixture' : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
