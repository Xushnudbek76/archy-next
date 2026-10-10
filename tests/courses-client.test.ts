import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  createCourse,
  courseError,
  listCourses,
  renameCourse,
} from '../api/courses-client.ts';
import { ApiError } from '../api/json-client.ts';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const course = {
  id: '73f0a264-3fcb-460a-a4ec-59d849a3f6ae',
  title: 'Algebra',
  archivedAt: null,
  createdAt: '2026-10-10T01:00:00Z',
  updatedAt: '2026-10-10T01:00:00Z',
};

test('course outage errors explain availability rather than suggesting invalid input', () => {
  assert.match(
    courseError(
      new ApiError(503, 'unavailable', 'Unable to complete your request.'),
    ),
    /temporarily unavailable/,
  );
});

test('course client rejects malformed successful responses instead of displaying fake data', async () => {
  globalThis.fetch = async () =>
    Response.json({
      items: [{ title: 'Incomplete' }],
      total: 1,
      nextPage: null,
    });
  await assert.rejects(listCourses(false, 1), /unavailable/i);
});
test('course writes acquire CSRF and preserve the requested create or rename method', async () => {
  const requests: {
    path: string;
    method: string;
    csrf: string | null;
    body?: BodyInit | null;
  }[] = [];
  globalThis.fetch = async (input, init) => {
    requests.push({
      path: String(input),
      method: init?.method ?? 'GET',
      csrf: new Headers(init?.headers).get('X-CSRFToken'),
      body: init?.body,
    });
    return Response.json(
      String(input) === '/api/auth/csrf' ? { csrfToken: 'fresh-csrf' } : course,
    );
  };
  assert.equal((await createCourse('Algebra')).title, 'Algebra');
  assert.equal((await renameCourse(course.id, 'Geometry')).id, course.id);
  assert.deepEqual(
    requests.map((r) => [r.path, r.method, r.csrf]),
    [
      ['/api/auth/csrf', 'GET', null],
      ['/api/courses', 'POST', 'fresh-csrf'],
      ['/api/auth/csrf', 'GET', null],
      [`/api/courses/${course.id}`, 'PATCH', 'fresh-csrf'],
    ],
  );
  assert.equal(requests[3]?.body, '{"title":"Geometry"}');
});
test('course timeouts explain how to recover and never replay a write', async () => {
  let writes = 0;
  globalThis.fetch = async (input) => {
    if (String(input) === '/api/auth/csrf')
      return Response.json({ csrfToken: 'csrf' });
    writes++;
    return Response.json(
      { code: 'timeout', message: 'private backend details' },
      { status: 504 },
    );
  };
  await assert.rejects(createCourse('Algebra'), /Refresh your courses/);
  assert.equal(writes, 1);
});
