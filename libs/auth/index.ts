import { AuthError, authRequest } from '../../api/auth-client.ts';
import { returnPathCookie } from './return-path.ts';
import {
  isUser,
  type LoginInput,
  type ResetInput,
  type SignupInput,
  type User,
} from '../types/auth.ts';

export async function logIn(input: LoginInput): Promise<User> {
  const user = await authRequest('/api/auth/login', input);
  if (!isUser(user))
    throw new AuthError(503, 'unavailable', 'Unable to check your account.');
  document.cookie = returnPathCookie(
    '/',
    window.location.protocol === 'https:',
    true,
  );
  return user;
}
export async function signUp(input: SignupInput): Promise<void> {
  await authRequest('/api/auth/signup', input);
}
export async function logOut(): Promise<void> {
  await authRequest('/api/auth/logout', {});
  document.cookie = returnPathCookie(
    '/',
    window.location.protocol === 'https:',
    true,
  );
}
export async function confirmEmail(token: string): Promise<void> {
  await authRequest('/api/auth/confirm-email', { token });
}
export async function requestPasswordReset(email: string): Promise<void> {
  await authRequest('/api/auth/password-reset', { email });
}
export async function resetPassword(input: ResetInput): Promise<void> {
  await authRequest('/api/auth/reset-password', input);
}
export async function currentUser(): Promise<User> {
  const user = await authRequest('/api/users/me');
  if (!isUser(user))
    throw new AuthError(503, 'unavailable', 'Unable to check your account.');
  return user;
}
