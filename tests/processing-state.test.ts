import test from 'node:test';
import assert from 'node:assert/strict';
import { processingState } from '../libs/hooks/processing-state.ts';
test('changing the linked recording clears earlier transcript and notes', () => {
  const old = processingState('old', undefined, {
    transcript: {
      available: true,
      language: 'en',
      provider: 'fixture',
      model: 'fixture',
      data: { text: 'Old transcript', segments: [] },
    },
    notes: { available: false },
  });
  const next = processingState('new', old, { error: 'Waiting' });
  assert.equal(next.id, 'new');
  assert.equal(next.transcript, null);
  assert.equal(next.notes, null);
  assert.equal(next.error, 'Waiting');
  assert.equal(
    processingState('old', old, { error: 'Retry' }).transcript,
    old.transcript,
  );
});
