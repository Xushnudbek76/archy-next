'use client';
import { useContext } from 'react';
import { SessionContext } from '@/libs/auth/SessionProvider';

export function useDemo() {
  return useContext(SessionContext)?.user.isDemo === true;
}
