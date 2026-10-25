import test from 'node:test';
import assert from 'node:assert/strict';
import { readTutorStream } from '../api/tutor-stream-client.ts';
const id = '89e0ae43-73e9-45db-a535-dd336adec689';
function bytes(parts: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      parts.forEach((part) => controller.enqueue(part));
      controller.close();
    },
  });
}
test('fragmented Korean UTF-8 and NDJSON events preserve the complete answer', async () => {
  const wire = new TextEncoder().encode(
    JSON.stringify({ type: 'delta', text: '한국어 answer' }) +
      '\n' +
      JSON.stringify({ type: 'sources', items: [] }) +
      '\n' +
      JSON.stringify({ type: 'done', messageId: id }) +
      '\n',
  );
  const events: unknown[] = [];
  await readTutorStream(
    bytes(Array.from(wire, (byte) => new Uint8Array([byte]))),
    (event) => events.push(event),
  );
  assert.deepEqual(events[0], { type: 'delta', text: '한국어 answer' });
  assert.equal(events.length, 3);
});
test('an interrupted or oversized tutor response cannot become a completed reply', async () => {
  const encode = new TextEncoder();
  await assert.rejects(
    () =>
      readTutorStream(
        bytes([encode.encode('{"type":"delta","text":"partial"}\n')]),
        () => {},
      ),
    /incomplete|interrupted/i,
  );
  await assert.rejects(
    () =>
      readTutorStream(
        bytes([
          encode.encode(
            JSON.stringify({ type: 'delta', text: 'x'.repeat(20001) }) + '\n',
          ),
        ]),
        () => {},
      ),
    /limit|invalid/i,
  );
});
test('a provider error remains a failure after partial output', async () => {
  const wire = new TextEncoder().encode(
    '{"type":"delta","text":"partial"}\n{"type":"error","code":"quota_wait"}\n',
  );
  await assert.rejects(
    () => readTutorStream(bytes([wire]), () => {}),
    /limit|later|quota/i,
  );
});
