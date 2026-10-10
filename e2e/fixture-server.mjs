// Isolated browser-test HTTP fixture. Never imported by the application.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
const users = new Map();
const sessions = new Map();
const emails = new Map();
const courses = new Map();
function publicCourse(course) {
  const value = { ...course };
  delete value.owner;
  return value;
}
const csrf = 'testcsrf01234567890123456789012345';
createServer(async (request, response) => {
  const path = request.url;
  let raw = '';
  for await (const chunk of request) raw += chunk;
  const data = raw ? JSON.parse(raw) : {};
  const reply = (status, payload) => {
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(payload));
  };
  const fail = (status) =>
    reply(status, {
      code: 'invalid_request',
      message: 'Check the request fields.',
      requestId: randomUUID(),
    });
  if (path === '/v1/health/live') return reply(200, { status: 'ok' });
  if (path?.startsWith('/mail?'))
    return reply(200, {
      link: emails.get(
        new URL(path, 'http://localhost').searchParams.get('email'),
      ),
    });
  if (path === '/v1/auth/csrf') {
    response.setHeader('Set-Cookie', `csrftoken=${csrf}; Path=/; SameSite=Lax`);
    return reply(200, { csrfToken: csrf });
  }
  const cookie = request.headers.cookie ?? '';
  const session = cookie.match(/sessionid=([^;]+)/)?.[1];
  const user = sessions.get(session);
  if (path === '/v1/users/me' && session === 'unavailable-session')
    return fail(503);
  if (path === '/v1/users/me')
    return user ? reply(200, user.profile) : fail(403);
  const url = new URL(path, 'http://localhost');
  if (url.pathname === '/v1/courses' && request.method === 'GET') {
    if (!user) return fail(403);
    const archived = url.searchParams.get('archived') === 'true';
    const owned = [...courses.values()]
      .filter(
        (c) =>
          c.owner === user.profile.id && Boolean(c.archivedAt) === archived,
      )
      .reverse();
    const page = Number(url.searchParams.get('page') ?? 1);
    if (page > 1 && (page - 1) * 20 >= owned.length) return fail(404);
    return reply(200, {
      items: owned.slice((page - 1) * 20, page * 20).map(publicCourse),
      total: owned.length,
      nextPage: page * 20 < owned.length ? page + 1 : null,
    });
  }
  if (
    !['POST', 'PATCH'].includes(request.method) ||
    request.headers.origin !== 'http://127.0.0.1:3130' ||
    !cookie.includes(`csrftoken=${csrf}`) ||
    request.headers['x-csrftoken'] !== csrf
  )
    return fail(403);
  if (url.pathname.startsWith('/v1/courses')) {
    if (!user) return fail(403);
    if (path === '/v1/courses' && request.method === 'POST') {
      const now = new Date().toISOString();
      const course = {
        id: randomUUID(),
        title: data.title.trim(),
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      courses.set(course.id, { ...course, owner: user.profile.id });
      return reply(201, course);
    }
    const parts = url.pathname.split('/');
    const course = courses.get(parts[3]);
    if (!course || course.owner !== user.profile.id) return fail(404);
    if (request.method === 'PATCH' && !course.archivedAt)
      course.title = data.title.trim();
    else if (request.method === 'POST' && parts[4] === 'archive')
      course.archivedAt ??= new Date().toISOString();
    else return fail(404);
    course.updatedAt = new Date().toISOString();
    return reply(200, publicCourse(course));
  }
  if (path === '/v1/auth/signup') {
    const user = {
      profile: {
        id: randomUUID(),
        email: data.email.toLowerCase(),
        displayName: data.displayName ?? '',
        role: 'USER',
      },
      password: data.password,
      active: false,
    };
    users.set(user.profile.email, user);
    emails.set(
      user.profile.email,
      `http://127.0.0.1:3130/confirm-email?token=${user.profile.id}`,
    );
    if (data.email.startsWith('delayed-signup-')) await delay(6000);
    return reply(202, { message: 'Check your email for the next step.' });
  }
  if (path === '/v1/auth/confirm-email') {
    const user = [...users.values()].find((u) => u.profile.id === data.token);
    if (!user || user.active) return fail(400);
    user.active = true;
    return reply(200, { message: 'Email confirmed.' });
  }
  if (path === '/v1/auth/login') {
    const user = users.get(data.email.toLowerCase());
    if (!user?.active || user.password !== data.password) return fail(403);
    const id = randomUUID();
    sessions.set(id, user);
    response.setHeader(
      'Set-Cookie',
      `sessionid=${id}; Path=/; HttpOnly; SameSite=Lax`,
    );
    return reply(200, user.profile);
  }
  if (path === '/v1/auth/logout') {
    sessions.delete(session);
    response.setHeader(
      'Set-Cookie',
      'sessionid=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
    );
    return reply(200, { message: 'Signed out.' });
  }
  if (path === '/v1/auth/password-reset') {
    const user = users.get(data.email.toLowerCase());
    if (user?.active)
      emails.set(
        user.profile.email,
        `http://127.0.0.1:3130/reset-password?uid=${user.profile.id}&token=reset-fixture`,
      );
    return reply(202, { message: 'Check your email for the next step.' });
  }
  if (path === '/v1/auth/password-reset/confirm') {
    const user = [...users.values()].find((u) => u.profile.id === data.uid);
    if (
      !user ||
      data.token !== 'reset-fixture' ||
      data.password !== data.passwordConfirmation
    )
      return fail(400);
    user.password = data.password;
    for (const [key, value] of sessions)
      if (value === user) sessions.delete(key);
    return reply(200, { message: 'Password updated.' });
  }
  return fail(404);
}).listen(3137, '127.0.0.1');
