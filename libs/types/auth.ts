export type User = {
  id: string;
  email: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
};
export type LoginInput = { email: string; password: string };
export type SignupInput = LoginInput & {
  passwordConfirmation: string;
  displayName?: string;
};
export type ResetInput = {
  uid: string;
  token: string;
  password: string;
  passwordConfirmation: string;
};

export function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === 'string' &&
    /^[0-9a-f-]{36}$/i.test(user.id) &&
    typeof user.email === 'string' &&
    user.email.length <= 254 &&
    typeof user.displayName === 'string' &&
    user.displayName.length <= 100 &&
    (user.role === 'USER' || user.role === 'ADMIN')
  );
}

export function safeReturnPath(value?: string): string {
  return ['/', '/courses', '/recordings', '/settings'].includes(value ?? '')
    ? value!
    : '/';
}
