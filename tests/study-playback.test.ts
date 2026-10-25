import test from 'node:test';
import assert from 'node:assert/strict';
import { seekTime, adjacentTab } from '../libs/components/study/playback.ts';
test('transcript seeking requires a finite nonnegative timestamp and clamps to loaded duration', () => {
  assert.equal(seekTime(12, 8), 8);
  assert.equal(seekTime(12, NaN), 12);
  assert.equal(seekTime(Infinity, 8), null);
  assert.equal(seekTime(-1, 8), null);
});
test('tab keyboard navigation wraps and handles Home and End', () => {
  assert.equal(adjacentTab(0, 3, 'ArrowLeft'), 2);
  assert.equal(adjacentTab(2, 3, 'ArrowRight'), 0);
  assert.equal(adjacentTab(1, 3, 'Home'), 0);
  assert.equal(adjacentTab(0, 3, 'End'), 2);
  assert.equal(adjacentTab(0, 3, 'Enter'), null);
});
