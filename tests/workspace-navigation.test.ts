import assert from 'node:assert/strict';
import test from 'node:test';
import { activeWorkspacePage } from '../libs/components/layout/navigation.ts';

test('nested materials keep the documents navigation active', () => {
  assert.equal(activeWorkspacePage('/documents/abc').href, '/documents');
  assert.equal(activeWorkspacePage('/settings/language').href, '/settings');
  assert.equal(activeWorkspacePage('/record').href, '/record');
  assert.equal(activeWorkspacePage('/dashboard').href, '/dashboard');
  assert.equal(activeWorkspacePage('/').href, '/documents');
  assert.equal(activeWorkspacePage('/recordings-other').href, '/documents');
});
