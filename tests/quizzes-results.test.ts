import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  quizResultRows,
  quizScore,
} from '../libs/components/quizzes/quiz-results.ts';
import type { Quiz, QuizAttempt } from '../libs/types/quizzes.ts';
const quiz: Quiz = {
  id: '73f0a264-3fcb-460a-a4ec-59d849a3f6ae',
  documentId: '124e2283-0408-426b-814d-536175bda467',
  title: 'Quiz',
  language: 'ko',
  provider: 'fixture',
  sourceRevision: 'a'.repeat(64),
  createdAt: '2026-10-26T00:00:00Z',
  questions: [
    {
      id: '00e71f2d-9eec-48d0-b99b-166a0ed48273',
      type: 'true_false',
      prompt: '관성은 운동의 변화를 방해한다.',
      options: ['참', '거짓'],
    },
  ],
};
const attempt: QuizAttempt = {
  id: quiz.documentId,
  quizId: quiz.id,
  score: 0,
  total: 1,
  createdAt: quiz.createdAt,
  results: [
    {
      questionId: quiz.questions[0]!.id,
      answer: 1,
      correctAnswer: 0,
      correct: false,
      explanation: '관성은 운동의 변화를 방해합니다.',
      sourceIds: ['pdf:known', 'pdf:missing'],
    },
  ],
};

test('result display uses persisted server scoring and correct option labels', () => {
  assert.deepEqual(quizScore(attempt), {
    correct: 0,
    total: 1,
    percent: 0,
    mistakes: 1,
  });
  const rows = quizResultRows(quiz, attempt);
  assert.equal(rows[0]?.selected, '거짓');
  assert.equal(rows[0]?.expected, '참');
  assert.equal(rows[0]?.explanation, '관성은 운동의 변화를 방해합니다.');
  assert.deepEqual(rows[0]?.sourceIds, ['pdf:known', 'pdf:missing']);
});

test('result rows cannot invent a question or grade outside the original quiz', () => {
  assert.throws(
    () => quizResultRows(quiz, { ...attempt, quizId: quiz.documentId }),
    /unavailable/,
  );
});
