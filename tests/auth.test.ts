import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isUser, safeReturnPath } from '../libs/types/auth.ts';

test('redirect destinations are limited to workspace routes', () => {
  for (const path of [
    'https://evil.example',
    '//evil.example',
    '/login',
    '/\\evil',
    '/courses?next=https://evil.example',
    undefined,
  ])
    assert.equal(safeReturnPath(path), '/');
  assert.equal(safeReturnPath('/courses'), '/courses');
});
test('identity requires database user shape and known role', () => {
  const user = {
    id: 'ae02c4fe-4b2a-47a4-a3bc-1a98638741a5',
    email: 'person@example.com',
    displayName: '',
    role: 'USER',
  };
  assert(isUser(user));
  assert(!isUser({ ...user, role: 'OWNER' }));
  assert(!isUser({ email: user.email }));
});
