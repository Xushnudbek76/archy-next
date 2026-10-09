import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { authRequest, AuthError } from '../api/auth-client.ts';

afterEach(() => mock.restoreAll());

test('browser waits for account responses within the upstream write budget', async () => {
  let mutations = 0;
  mock.method(
    globalThis,
    'fetch',
    async (...[input, options]: Parameters<typeof fetch>) => {
      const path = String(input);
      if (path.endsWith('/csrf'))
        return Response.json({ csrfToken: 'fixture-only-csrf' });
      mutations++;
      return new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            resolve(Response.json({ message: 'accepted' }, { status: 202 })),
          12000,
        );
        options?.signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(options?.signal?.reason);
          },
          { once: true },
        );
      });
    },
  );
  assert.deepEqual(
    await authRequest('/api/auth/signup', { email: 'fixture@example.com' }),
    { message: 'accepted' },
  );
  assert.equal(mutations, 1);
});

test('signup timeout explains the request may have completed without leaking upstream messages', async () => {
  mock.method(
    globalThis,
    'fetch',
    async (input: Parameters<typeof fetch>[0]) =>
      String(input).endsWith('/csrf')
        ? Response.json({ csrfToken: 'fixture-only-csrf' })
        : Response.json(
            { code: 'timeout', message: 'internal database connection detail' },
            { status: 504 },
          ),
  );
  await assert.rejects(authRequest('/api/auth/signup', {}), (error) => {
    assert(error instanceof AuthError);
    assert.equal(error.status, 504);
    assert.match(error.message, /may already have completed/);
    assert.match(error.message, /Check your email/);
    assert(!error.message.includes('database connection'));
    return true;
  });
});
