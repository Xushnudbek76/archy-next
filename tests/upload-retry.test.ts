import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';
import {
  UploadRateLimitError,
  waitForChunkRetry,
} from '../api/upload-retry.ts';

test('retry waits for the server delay and can be cancelled', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const controller = new AbortController();
  let settled = false;
  const waiting = waitForChunkRetry(0, 5, controller.signal).then(() => {
    settled = true;
  });
  t.mock.timers.tick(4999);
  await nextTurn();
  assert.equal(settled, false);
  controller.abort();
  await assert.rejects(waiting, { name: 'AbortError' });
});

test('retry backoff prevents an immediate third retry', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let settled = false;
  const waiting = waitForChunkRetry(2, 2, new AbortController().signal).then(
    () => {
      settled = true;
    },
  );
  t.mock.timers.tick(7999);
  await nextTurn();
  assert.equal(settled, false);
  t.mock.timers.tick(251);
  await waiting;
  assert.equal(settled, true);
});

test('a long server delay pauses instead of retrying early', async () => {
  await assert.rejects(
    waitForChunkRetry(0, 31, new AbortController().signal),
    UploadRateLimitError,
  );
});
