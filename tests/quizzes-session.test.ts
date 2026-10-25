import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  initialQuizSession,
  quizSessionReducer,
  quizAnswers,
} from '../libs/components/quizzes/quiz-session.ts';
import type { Quiz } from '../libs/types/quizzes.ts';
const quiz: Quiz = {
  id: '73f0a264-3fcb-460a-a4ec-59d849a3f6ae',
  documentId: '124e2283-0408-426b-814d-536175bda467',
  title: 'Quiz',
  language: 'en',
  provider: 'fixture',
  sourceRevision: 'a'.repeat(64),
  createdAt: '2026-10-26T00:00:00Z',
  questions: [
    {
      id: '00e71f2d-9eec-48d0-b99b-166a0ed48273',
      type: 'true_false',
      prompt: 'Inertia resists motion changes.',
      options: ['True', 'False'],
    },
    {
      id: '6fe88253-ac8f-48ae-96c8-4b8673296d91',
      type: 'multiple_choice',
      prompt: 'Which is a force?',
      options: ['Gravity', 'Time', 'Speed', 'Distance'],
    },
  ],
};

test('quiz answers reject incomplete, foreign, boolean and out-of-range choices', () => {
  assert.throws(() => quizAnswers(quiz, {}), /every question/);
  assert.throws(
    () =>
      quizAnswers(quiz, {
        [quiz.questions[0]!.id]: 2,
        [quiz.questions[1]!.id]: 0,
      }),
    /valid option/,
  );
  assert.throws(
    () =>
      quizAnswers(quiz, {
        [quiz.questions[0]!.id]: true as unknown as number,
        [quiz.questions[1]!.id]: 0,
      }),
    /valid option/,
  );
  assert.throws(
    () =>
      quizAnswers(quiz, {
        ...Object.fromEntries(quiz.questions.map((q) => [q.id, 0])),
        foreign: 0,
      }),
    /question/,
  );
});

test('selection and question navigation retain earlier answers and bound indices', () => {
  let state = initialQuizSession(quiz);
  state = quizSessionReducer(state, {
    type: 'answer',
    questionId: quiz.questions[0]!.id,
    answer: 1,
  });
  state = quizSessionReducer(state, { type: 'move', index: 1 });
  state = quizSessionReducer(state, {
    type: 'answer',
    questionId: quiz.questions[1]!.id,
    answer: 0,
  });
  state = quizSessionReducer(state, { type: 'move', index: -1 });
  assert.equal(state.index, 1);
  assert.deepEqual(quizAnswers(quiz, state.answers), [
    { questionId: quiz.questions[0]!.id, answer: 1 },
    { questionId: quiz.questions[1]!.id, answer: 0 },
  ]);
});

test('failed submission preserves answers and late responses cannot complete another quiz', () => {
  let state = initialQuizSession(quiz);
  for (const question of quiz.questions)
    state = quizSessionReducer(state, {
      type: 'answer',
      questionId: question.id,
      answer: 0,
    });
  state = quizSessionReducer(state, { type: 'submitting' });
  assert.equal(state.pending, true);
  state = quizSessionReducer(state, {
    type: 'failed',
    quizId: quiz.id,
    error: 'Connection lost',
  });
  assert.equal(state.pending, false);
  assert.equal(Object.keys(state.answers).length, 2);
  const previous = state;
  state = quizSessionReducer(state, {
    type: 'failed',
    quizId: quiz.documentId,
    error: 'Stale request',
  });
  assert.equal(state, previous);
});
