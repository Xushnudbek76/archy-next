import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createQuiz, listQuizzes, readQuiz } from '../api/quizzes-client.ts';
const quizFixture = {
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
      options: ['Motion', 'Force', 'Speed', 'Energy'],
    },
  ],
};

const documentId = quizFixture.documentId;

test('quiz creation uses CSRF, requested options and the full generation deadline', async (t) => {
  const deadlines: number[] = [];
  t.mock.method(AbortSignal, 'timeout', (ms: number) => {
    deadlines.push(ms);
    return new AbortController().signal;
  });
  const calls: { path: string; init?: RequestInit }[] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (path: string, init?: RequestInit) => {
      calls.push({ path, init });
      return Response.json(
        path === '/api/auth/csrf' ? { csrfToken: 'csrf' } : quizFixture,
      );
    },
  );
  const quiz = await createQuiz(documentId, {
    questionType: 'mixed',
    questionCount: 10,
    language: 'ko',
  });
  assert.equal(quiz.id, quizFixture.id);
  assert.deepEqual(
    calls.map((c) => c.path),
    ['/api/auth/csrf', `/api/study/documents/${documentId}/quizzes`],
  );
  assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), {
    questionType: 'mixed',
    questionCount: 10,
    language: 'ko',
  });
  assert.equal(calls[1]?.init?.method, 'POST');
  assert.equal(
    (calls[1]?.init?.headers as Record<string, string>)['X-CSRFToken'],
    'csrf',
  );
  assert(deadlines.includes(50000));
});

test('quiz history is read-only and rejects a foreign document response', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async (_path: string, init?: RequestInit) => {
      assert.equal(init?.method, 'GET');
      return Response.json({ items: [quizFixture] });
    },
  );
  assert.equal((await listQuizzes(documentId)).length, 1);
  await assert.rejects(listQuizzes(quizFixture.id), /Quiz data/);
});

test('quiz detail rejects an unrelated ID and abort never returns stale quiz state', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json(quizFixture));
  await assert.rejects(readQuiz(documentId), /Quiz data/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(listQuizzes(documentId, controller.signal), {
    name: 'AbortError',
  });
});
