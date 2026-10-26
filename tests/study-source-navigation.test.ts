import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sourceDestination,
  sourcesForRevision,
} from '../libs/components/study/source-navigation.ts';
import type { StudySource } from '../libs/types/study.ts';
test('saved tutor excerpts cannot seek newly linked audio when the source changed', () => {
  const source: StudySource = {
    id: 'old',
    kind: 'transcript',
    text: 'Original explanation',
    page: null,
    start: 20,
    end: 25,
  };
  assert.deepEqual(sourceDestination(source, []), {
    current: false,
    page: null,
    time: null,
  });
  assert.deepEqual(sourceDestination(source, [source]), {
    current: true,
    page: null,
    time: 20,
  });
});
test('PDF source navigation uses only a currently known page location', () => {
  const source: StudySource = {
    id: 'pdf:1',
    kind: 'pdf',
    text: 'Page text',
    page: 2,
    start: null,
    end: null,
  };
  assert.deepEqual(sourceDestination(source, [source]), {
    current: true,
    page: 2,
    time: null,
  });
});
test('previously loaded sources cannot authorize a new material revision while reload fails', () => {
  const source: StudySource = {
    id: 'old',
    kind: 'transcript',
    text: 'Old audio',
    page: null,
    start: 20,
    end: 25,
  };
  const loaded = { revision: 'old-material', items: [source] };
  assert.equal(
    sourceDestination(source, sourcesForRevision(loaded, 'new-material')).time,
    null,
  );
  assert.equal(
    sourceDestination(source, sourcesForRevision(loaded, 'old-material')).time,
    20,
  );
});
