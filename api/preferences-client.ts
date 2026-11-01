import { ApiError, jsonRequest } from './json-client.ts';
import {
  isProfile,
  isNoteFormats,
  type Profile,
} from '../libs/types/preferences.ts';
const invalid = () =>
  new ApiError(503, 'unavailable', 'Unable to load your account preferences.');
export async function readProfile(signal?: AbortSignal) {
  const value = await jsonRequest('/api/preferences', undefined, undefined, {
    signal,
  });
  if (!isProfile(value)) throw invalid();
  return value;
}
export async function saveProfile(
  payload: Partial<Omit<Profile, 'email'>>,
  expectedUserId: string,
) {
  const value = await jsonRequest('/api/preferences', payload, 'PATCH', {
    expectedUserId,
  });
  if (!isProfile(value)) throw invalid();
  return value;
}
export async function readNoteFormats(signal?: AbortSignal) {
  const value = await jsonRequest(
    '/api/preferences/formats',
    undefined,
    undefined,
    { signal },
  );
  if (!isNoteFormats(value)) throw invalid();
  return value.items;
}
export async function saveNoteFormat(
  payload: { name: string; instructions: string },
  expectedUserId: string,
  id?: string,
) {
  return jsonRequest(
    `/api/preferences/formats${id ? '/' + id : ''}`,
    payload,
    id ? 'PATCH' : 'POST',
    { expectedUserId },
  );
}
export async function removeNoteFormat(id: string, expectedUserId: string) {
  return jsonRequest(`/api/preferences/formats/${id}/remove`, {}, 'POST', {
    expectedUserId,
  });
}
export async function closeAccount(
  password: string,
  confirmation: string,
  expectedUserId: string,
) {
  return jsonRequest(
    '/api/preferences/close',
    { password, confirmation },
    'POST',
    { expectedUserId },
  );
}
export function preferenceError(cause: unknown) {
  if (cause instanceof ApiError) {
    if (cause.code === 'invalid_password')
      return 'Check your current password.';
    if (cause.code === 'format_limit')
      return 'You can save up to 10 custom note formats.';
    if (cause.code === 'active_subscription')
      return 'Cancel your subscription before closing your account.';
    if (cause.code === 'payment_pending')
      return 'Resolve the pending payment in billing settings before closing your account.';
    if (cause.status === 400) return 'Check the fields and try again.';
    if (cause.status === 403)
      return 'Your session expired or this workspace is read-only.';
  }
  return 'Unable to save your preferences. Refresh before trying again.';
}
