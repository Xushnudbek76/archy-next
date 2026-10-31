import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resultCaption } from '../libs/components/demo/result-caption.ts';
import { isQuiz } from '../libs/types/quizzes.ts';

test('sample results are never described as live AI output', () => {
  assert.match(resultCaption('demo'), /hand-written/i);
  assert.match(resultCaption('fixture'), /synthetic/i);
  assert.match(resultCaption('groq'), /AI-generated/i);
});
test('prepared sample quizzes use the same strict question contract', () => {
  const id = '254477df-1d64-5d68-900f-dcbb4400de12';
  const quiz = {
    id,
    documentId: id,
    title: 'Sample quiz',
    provider: 'demo',
    language: 'en',
    sourceRevision: 'a'.repeat(64),
    createdAt: new Date().toISOString(),
    questions: [
      {
        id,
        type: 'true_false',
        prompt: 'Is this sample material?',
        options: ['True', 'False'],
      },
    ],
  };
  assert.equal(isQuiz(quiz), true);
  assert.equal(isQuiz({ ...quiz, provider: 'untrusted' }), false);
  assert.equal(
    isQuiz({
      ...quiz,
      questions: [{ ...quiz.questions[0], correctAnswer: 0 }],
    }),
    false,
  );
});
