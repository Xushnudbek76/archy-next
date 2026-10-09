'use client';

import { useEffect } from 'react';

export function usePrivateLink(path: '/confirm-email' | '/reset-password') {
  useEffect(() => {
    // Keep the token in component props, remove it from the address bar and history entry.
    window.history.replaceState(window.history.state, '', path);
  }, [path]);
}
