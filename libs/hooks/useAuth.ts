'use client';

import { useContext } from 'react';
import { SessionContext } from '@/libs/auth/SessionProvider';

export function useAuth() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useAuth requires SessionProvider');
  return session;
}
