'use client';

import { useEffect, useState, useCallback } from 'react';
import { ACTIVE_API_TOKEN_KEY } from '@/lib/api-client';

/**
 * Mirror key for the *id* (not plaintext) of the active token. The plaintext
 * lives under `ACTIVE_API_TOKEN_KEY` so `v1ApiClient` can read it without a
 * round-trip; the id is what's persisted to the server via `/v1/account`.
 */
const ACTIVE_TOKEN_ID_KEY = 'wh.research.activeTokenId';

const ACTIVE_TOKEN_CHANGED_EVENT = 'wh.activeToken.changed';

/**
 * Read/write the active API token from anywhere in the app.
 *
 * - `id` is the token's database id (matches `/v1/tokens`).
 * - `plaintext` is the `wh_rsa_…` string the user only sees once after mint.
 *
 * Both are stored in `localStorage` and the hook re-reads them on a custom
 * "wh.activeToken.changed" event so a change in one tab/component is
 * picked up by every other consumer (topbar chip, account picker, etc).
 */
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

  // Initial read + cross-tab/component sync.
  useEffect(() => {
    const read = () => {
      try {
        setActiveState({
          id: window.localStorage.getItem(ACTIVE_TOKEN_ID_KEY),
          plaintext: window.localStorage.getItem(ACTIVE_API_TOKEN_KEY),
        });
      } catch {
        // SSR / private-mode: leave state at defaults.
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
      // ignore
    }
    setActiveState(next);
    window.dispatchEvent(new Event(ACTIVE_TOKEN_CHANGED_EVENT));
  }, []);

  const clear = useCallback(() => setActive({ id: null, plaintext: null }), [setActive]);

  return { active, setActive, clear };
}
