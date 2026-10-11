import type { APIRequestContext } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function emailLink(
  request: APIRequestContext,
  email: string,
): Promise<string> {
  if (!process.env.AUTH_EMAIL_DIR)
    return (
      await (
        await request.get(
          `http://127.0.0.1:3137/mail?email=${encodeURIComponent(email)}`,
        )
      ).json()
    ).link;
  const files = (await readdir(process.env.AUTH_EMAIL_DIR)).sort().reverse();
  for (const file of files) {
    const raw = await readFile(join(process.env.AUTH_EMAIL_DIR, file), 'utf8');
    if (!raw.includes(`To: ${email}`)) continue;
    const decoded = raw
      .replace(/=\r?\n/g, '')
      .replace(/=([A-F0-9]{2})/g, (_, hex: string) =>
        String.fromCharCode(parseInt(hex, 16)),
      );
    const link = decoded.match(/https?:\/\/[^\s]+/)?.[0];
    if (link) return link;
  }
  throw new Error('Test email not found');
}

export async function signInTestUser(
  context: import('@playwright/test').BrowserContext,
  email: string,
) {
  const request = context.request;
  const password = 'Private-course-test-passphrase-821!';
  const post = async (path: string, data: unknown) => {
    const csrf = (await (await request.get('/api/auth/csrf')).json()).csrfToken;
    return request.post(path, {
      data,
      headers: { Origin: 'http://127.0.0.1:3130', 'X-CSRFToken': csrf },
    });
  };
  const signup = await post('/api/auth/signup', {
    email,
    password,
    passwordConfirmation: password,
    displayName: 'Lecture Owner',
  });
  if (signup.status() !== 202) throw new Error('Test account signup failed');
  const token = new URL(await emailLink(request, email)).searchParams.get(
    'token',
  );
  if ((await post('/api/auth/confirm-email', { token })).status() !== 200)
    throw new Error('Test confirmation failed');
  if ((await post('/api/auth/login', { email, password })).status() !== 200)
    throw new Error('Test login failed');
  return post;
}
