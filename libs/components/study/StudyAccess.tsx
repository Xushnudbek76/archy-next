'use client';
import { createContext, useContext } from 'react';
import { useDemo } from '@/libs/hooks/useDemo';
const StudyReadOnly = createContext(false);
export function StudyAccessProvider({
  readOnly,
  children,
}: {
  readOnly: boolean;
  children: React.ReactNode;
}) {
  return <StudyReadOnly value={readOnly}>{children}</StudyReadOnly>;
}
export function useStudyReadOnly() {
  const locked = useContext(StudyReadOnly);
  const demo = useDemo();
  return locked || demo;
}
