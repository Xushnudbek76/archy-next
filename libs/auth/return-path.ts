import { safeReturnPath } from '../types/auth.ts';

// This cookie contains only a navigation preference, never a credential.
export function storedReturnPath(value?: string): string {
  try {
    return safeReturnPath(
      value === undefined ? undefined : decodeURIComponent(value),
    );
  } catch {
    return '/';
  }
}

export function returnPathCookie(
  path: string,
  secure: boolean,
  clear = false,
): string {
  const value = clear ? '' : encodeURIComponent(safeReturnPath(path));
  return `archy_return_to=${value}; Path=/; SameSite=Lax; Max-Age=${clear ? 0 : 3600}${secure ? '; Secure' : ''}`;
}
