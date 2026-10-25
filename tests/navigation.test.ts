import assert from 'node:assert/strict';
import test from 'node:test';
import { safeReturnPath } from '../libs/types/auth.ts';

test('document destinations survive signing in without allowing arbitrary redirects', () => {
  assert.equal(safeReturnPath('/dashboard'), '/dashboard');
  assert.equal(safeReturnPath('/documents'), '/documents');
  const path = '/documents/11111111-1111-4111-8111-111111111111';
  assert.equal(safeReturnPath(path), path);
  for (const invalid of [
    '/documents/../../admin',
    '//evil.com',
    '/documents/not-an-id',
    path + '?next=https://evil.com',
  ]) {
    assert.equal(safeReturnPath(invalid), '/');
  }
});
