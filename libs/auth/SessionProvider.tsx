'use client';

import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthError } from '@/api/auth-client';
import { currentUser, logOut } from '@/libs/auth';
import { safeReturnPath, type User } from '@/libs/types/auth';

export const SessionContext = createContext<{
  user: User;
  pending: boolean;
  error: string;
  signOut: () => Promise<void>;
  retry: () => Promise<void>;
} | null>(null);

export function SessionProvider({
  initialUser,
  children,
}: {
  initialUser: User;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState(initialUser);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const checking = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const retry = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      setUser(await currentUser());
      setError('');
    } catch (cause) {
      if (
        cause instanceof AuthError &&
        (cause.status === 401 || cause.status === 403)
      ) {
        router.replace(
          `/login?next=${encodeURIComponent(safeReturnPath(pathname))}`,
        );
        router.refresh();
      } else {
        setError('Unable to check your account. Please retry.');
      }
    } finally {
      checking.current = false;
    }
  }, [pathname, router]);
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') void retry();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [retry]);
  async function signOut() {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await logOut();
      router.replace('/login');
      router.refresh();
    } catch {
      setError('Unable to sign out. Please try again.');
    } finally {
      setPending(false);
    }
  }
  return (
    <SessionContext.Provider value={{ user, pending, error, signOut, retry }}>
      {children}
    </SessionContext.Provider>
  );
}
