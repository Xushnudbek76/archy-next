import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { studyRoute, forwardStudyRequest } from '../api/study-proxy.ts';
import { studyError } from '../api/study-client.ts';
import { ApiError } from '../api/json-client.ts';
test('notes explain disabled AI and unavailable source material', () => {
  assert.match(
    studyError(new ApiError(503, 'study_unavailable', 'Generic error')),
    /configured/,
  );
  assert.match(
    studyError(new ApiError(409, 'study_sources_unavailable', 'Generic error')),
    /readable material/,
  );
});
test('study generation has a distinct bounded write budget', () => {
  const route = studyRoute(
    ['documents', '89e0ae43-73e9-45db-a535-dd336adec689', 'study-notes'],
    'POST',
  );
  assert.equal(route?.timeoutMs, 45000);
});
test('study proxy exposes only allowlisted actionable errors', async () => {
  const fetch = mock.method(globalThis, 'fetch', async () =>
    Response.json(
      { code: 'study_unavailable', message: 'secret provider response' },
      { status: 503 },
    ),
  );
  try {
    const result = await forwardStudyRequest(
      new Request(
        'https://archy.test/api/study/documents/89e0ae43-73e9-45db-a535-dd336adec689/study-notes',
        {
          method: 'POST',
          headers: {
            Origin: 'https://archy.test',
            'Content-Type': 'application/json',
          },
          body: '{}',
        },
      ),
      ['documents', '89e0ae43-73e9-45db-a535-dd336adec689', 'study-notes'],
      { apiBaseUrl: 'https://api.archy.test', appOrigin: 'https://archy.test' },
    );
    const body = await result.json();
    assert.equal(body.code, 'study_unavailable');
    assert.match(body.message, /configured/);
    assert.doesNotMatch(body.message, /secret/);
  } finally {
    fetch.mock.restore();
  }
});
