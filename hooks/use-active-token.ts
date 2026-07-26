'use client';

import { useEffect, useState, useCallback } from 'react';
import { ACTIVE_API_TOKEN_KEY } from '@/lib/api-client';

const ACTIVE_TOKEN_ID_KEY = 'wh.research.activeTokenId';

const ACTIVE_TOKEN_CHANGED_EVENT = 'wh.activeToken.changed';

export interface ActiveTokenState {
  id: string | null;
  plaintext: string | null;
}

export function useActiveToken(): {
  active: ActiveTokenState;
  setActive: (next: ActiveTokenState) => void;
  clear: () => void;
} {
  const [active, setActiveState] = useState<ActiveTokenState>({
    id: null,
    plaintext: null,
  });

  useEffect(() => {
    const read = () => {
      try {
        setActiveState({
          id: window.localStorage.getItem(ACTIVE_TOKEN_ID_KEY),
          plaintext: window.localStorage.getItem(ACTIVE_API_TOKEN_KEY),
        });
      } catch {
      }
    };
    read();
    window.addEventListener(ACTIVE_TOKEN_CHANGED_EVENT, read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener(ACTIVE_TOKEN_CHANGED_EVENT, read);
      window.removeEventListener('storage', read);
    };
  }, []);

  const setActive = useCallback((next: ActiveTokenState) => {
    try {
      if (next.id) window.localStorage.setItem(ACTIVE_TOKEN_ID_KEY, next.id);
      else window.localStorage.removeItem(ACTIVE_TOKEN_ID_KEY);
      if (next.plaintext) window.localStorage.setItem(ACTIVE_API_TOKEN_KEY, next.plaintext);
      else window.localStorage.removeItem(ACTIVE_API_TOKEN_KEY);
    } catch {
    }
    setActiveState(next);
    window.dispatchEvent(new Event(ACTIVE_TOKEN_CHANGED_EVENT));
  }, []);

  const clear = useCallback(() => setActive({ id: null, plaintext: null }), [setActive]);

  return { active, setActive, clear };
}
