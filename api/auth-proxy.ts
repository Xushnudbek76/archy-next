import { forwardJsonRequest, type AuthConfiguration } from './json-proxy.ts';
export { authConfiguration, sessionCookies } from './json-proxy.ts';
export type { AuthConfiguration } from './json-proxy.ts';
const routes: Record<string, { path: string; method: string }> = {
  csrf: { path: '/v1/auth/csrf', method: 'GET' },
  signup: { path: '/v1/auth/signup', method: 'POST' },
  login: { path: '/v1/auth/login', method: 'POST' },
  logout: { path: '/v1/auth/logout', method: 'POST' },
  'confirm-email': { path: '/v1/auth/confirm-email', method: 'POST' },
  'password-reset': { path: '/v1/auth/password-reset', method: 'POST' },
  'reset-password': { path: '/v1/auth/password-reset/confirm', method: 'POST' },
  me: { path: '/v1/users/me', method: 'GET' },
};

export function forwardAuthRequest(
  request: Request,
  action: string,
  supplied?: AuthConfiguration,
): Promise<Response> {
  return forwardJsonRequest(
    request,
    Object.hasOwn(routes, action) ? routes[action] : undefined,
    supplied,
  );
}
