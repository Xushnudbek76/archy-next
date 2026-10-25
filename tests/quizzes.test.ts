import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isQuiz, quizPath, type Quiz } from '../libs/types/quizzes.ts';

export const quizFixture: Quiz = {
  id: '73f0a264-3fcb-460a-a4ec-59d849a3f6ae',
  documentId: '124e2283-0408-426b-814d-536175bda467',
  title: 'Lecture quiz',
  language: 'en',
  provider: 'fixture',
  sourceRevision: 'a'.repeat(64),
  createdAt: '2026-10-26T00:00:00Z',
  questions: [
    {
      id: '00e71f2d-9eec-48d0-b99b-166a0ed48273',
      type: 'multiple_choice',
      prompt: 'What is inertia?',
      options: ['Resistance to a change in motion', 'Force', 'Speed', 'Energy'],
    },
  ],
};

test('quiz guards accept the public question contract and short mistake retries', () => {
  assert.equal(isQuiz(quizFixture), true);
  assert.equal(
    isQuiz({
      ...quizFixture,
      questions: [
        {
          ...quizFixture.questions[0],
          type: 'true_false',
          options: ['True', 'False'],
        },
      ],
    }),
    true,
  );
});

test('unsolved quizzes reject leaked answer keys and malformed options', () => {
  const question = quizFixture.questions[0]!;
  for (const field of ['correctAnswer', 'explanation', 'sourceIds'])
    assert.equal(
      isQuiz({ ...quizFixture, questions: [{ ...question, [field]: 0 }] }),
      false,
    );
  assert.equal(
    isQuiz({
      ...quizFixture,
      questions: [{ ...question, options: ['A', 'A', 'B', 'C'] }],
    }),
    false,
  );
  assert.equal(
    isQuiz({
      ...quizFixture,
      questions: [{ ...question, options: ['A', 'B'] }],
    }),
    false,
  );
  assert.equal(
    isQuiz({ ...quizFixture, questions: [question, question] }),
    false,
  );
  assert.equal(isQuiz({ ...quizFixture, sourceRevision: 'invalid' }), false);
});

test('quiz endpoint paths reject untrusted IDs', () => {
  assert.equal(
    quizPath(quizFixture.id),
    `/api/study/quizzes/${quizFixture.id}`,
  );
  assert.throws(() => quizPath('../documents'));
});

test('attempt guards verify server score consistency and option bounds against its quiz', async () => {
  const { isQuizAttempt } = await import('../libs/types/quizzes.ts');
  const attempt = {
    id: quizFixture.documentId,
    quizId: quizFixture.id,
    score: 1,
    total: 1,
    createdAt: quizFixture.createdAt,
    results: [
      {
        questionId: quizFixture.questions[0]!.id,
        answer: 0,
        correctAnswer: 0,
        correct: true,
        explanation: 'Inertia resists changes in motion.',
        sourceIds: ['pdf:source'],
      },
    ],
  };
  assert.equal(isQuizAttempt(attempt, quizFixture), true);
  assert.equal(isQuizAttempt({ ...attempt, score: 0 }, quizFixture), false);
  assert.equal(
    isQuizAttempt(
      { ...attempt, results: [{ ...attempt.results[0], answer: true }] },
      quizFixture,
    ),
    false,
  );
  assert.equal(
    isQuizAttempt(
      { ...attempt, results: [{ ...attempt.results[0], correctAnswer: 4 }] },
      quizFixture,
    ),
    false,
  );
  assert.equal(
    isQuizAttempt(
      {
        ...attempt,
        results: [{ ...attempt.results[0], questionId: quizFixture.id }],
      },
      quizFixture,
    ),
    false,
  );
});
