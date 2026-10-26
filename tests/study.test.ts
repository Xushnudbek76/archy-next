import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTime,
  isStudySource,
  isStudyNotes,
  sourceLabel,
  boundedText,
} from '../libs/types/study.ts';
import { studyRoute } from '../api/study-proxy.ts';
test('study routes accept only owned resource paths with valid UUIDs and methods', () => {
  const id = '89e0ae43-73e9-45db-a535-dd336adec689';
  assert.equal(studyRoute(['documents', id, 'sources'], 'POST'), undefined);
  assert.equal(
    studyRoute(['documents', '../account', 'sources'], 'GET'),
    undefined,
  );
  assert.equal(
    studyRoute(['documents', id, 'sources'], 'GET')?.path,
    `/v1/documents/${id}/sources`,
  );
  assert.equal(
    studyRoute(['documents', id, 'sources', 'other'], 'GET'),
    undefined,
  );
});
test('study response lengths use the same Unicode character bounds as the API', () => {
  assert.equal(boundedText('🔬'.repeat(100), 100), true);
  assert.equal(boundedText('🔬'.repeat(101), 100), false);
});
test('source navigation rejects non-finite times and preserves unknown PDF pages', () => {
  const source = {
    id: 's1',
    kind: 'pdf',
    text: 'Source',
    page: null,
    start: null,
    end: null,
  };
  assert.ok(isStudySource(source));
  assert.equal(sourceLabel(source as never), 'PDF material');
  assert.equal(
    isStudySource({ ...source, kind: 'transcript', start: Infinity, end: 2 }),
    false,
  );
  assert.equal(formatTime(125.2), '2:05');
  assert.equal(formatTime(NaN), '0:00');
});
test('study notes require explicit availability and supported language', () => {
  assert.ok(isStudyNotes({ available: false }));
  assert.equal(
    isStudyNotes({ available: true, language: 'xx', sections: [] }),
    false,
  );
});
