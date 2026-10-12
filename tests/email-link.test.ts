import assert from 'node:assert/strict';
import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { APIRequestContext } from '@playwright/test';
import { emailLink } from '../e2e/helpers.ts';

test('email links select the newest matching message, regardless of filename', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'archy-mail-'));
  const previous = process.env.AUTH_EMAIL_DIR;
  process.env.AUTH_EMAIL_DIR = directory;
  try {
    const old = join(directory, 'z-confirmation.eml');
    const recent = join(directory, 'a-reset.eml');
    await writeFile(
      old,
      'To: person@example.com\n\nhttp://localhost/confirm-email?token=old\n',
    );
    await writeFile(
      recent,
      'To: person@example.com\n\nhttp://localhost/reset-password?token=new\n',
    );
    await utimes(old, 1, 1);
    await utimes(recent, 2, 2);
    assert.equal(
      await emailLink({} as APIRequestContext, 'person@example.com'),
      'http://localhost/reset-password?token=new',
    );
  } finally {
    if (previous === undefined) delete process.env.AUTH_EMAIL_DIR;
    else process.env.AUTH_EMAIL_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
