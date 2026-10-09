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
  const [failure, setFailure] = useState<{
    message: string;
    action: 'check' | 'signOut';
  } | null>(null);
  const checking = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const checkSession = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      setUser(await currentUser());
      setFailure((previous) =>
        previous?.action === 'signOut' ? previous : null,
      );
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
        setFailure((previous) =>
          previous?.action === 'signOut'
            ? previous
            : {
                message: 'Unable to check your account. Please retry.',
                action: 'check',
              },
        );
      }
    } finally {
      checking.current = false;
    }
  }, [pathname, router]);
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') void checkSession();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [checkSession]);
  async function signOut() {
    if (pending) return;
    setPending(true);
    setFailure(null);
    try {
      await logOut();
      router.replace('/login');
      router.refresh();
    } catch {
      setFailure({
        message: 'Unable to sign out. Please try again.',
        action: 'signOut',
      });
    } finally {
      setPending(false);
    }
  }
  return (
    <SessionContext.Provider
      value={{
        user,
        pending,
        error: failure?.message ?? '',
        signOut,
        retry: failure?.action === 'signOut' ? signOut : checkSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
