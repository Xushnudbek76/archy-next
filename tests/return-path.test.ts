import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  returnPathCookie,
  storedReturnPath,
} from '../libs/auth/return-path.ts';

test('remembered destinations allow workspace routes only', () => {
  assert.equal(storedReturnPath('%2Fcourses'), '/courses');
  for (const value of [
    undefined,
    '%',
    '//attacker.example',
    'https%3A%2F%2Fattacker.example',
    '%2Fapi%2Fauth%2Flogout',
  ]) {
    assert.equal(storedReturnPath(value), '/');
  }
});
test('destination cookies expire, stay on this host, and can be cleared', () => {
  assert.equal(
    returnPathCookie('/courses', true),
    'archy_return_to=%2Fcourses; Path=/; SameSite=Lax; Max-Age=3600; Secure',
  );
  assert.equal(
    returnPathCookie('https://attacker.example', false),
    'archy_return_to=%2F; Path=/; SameSite=Lax; Max-Age=3600',
  );
  assert.equal(
    returnPathCookie('/', false, true),
    'archy_return_to=; Path=/; SameSite=Lax; Max-Age=0',
  );
});
