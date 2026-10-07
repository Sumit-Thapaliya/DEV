'use client';

import { create } from 'zustand';

import type { AuthUser } from '@/features/auth/api';

interface AuthState {
  user: AuthUser | null;
  /** Bearer token fallback for environments that block cookies. */
  token: string | null;
  setSession: (user: AuthUser, token?: string) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

/**
 * The real session lives in an httpOnly cookie. When third-party cookies
 * are blocked (e.g. embedded previews), the bearer token returned by the
 * API is kept in sessionStorage instead - it survives page reloads but is
 * cleared when the tab closes, so nothing is persisted long-term.
 * sessionStorage can throw in sandboxed frames, hence the guards.
 */

const SESSION_KEY = 'jobdev-session';

/* Embedded previews often block third-party cookies; some sandboxed frames
   also block one of the storages. Try sessionStorage first, then localStorage,
   so a logged-in session survives reloads in as many environments as possible. */
const readPersistedSession = (): { user: AuthUser; token: string } | null => {
  const stores: Array<Storage | null> = [safeStorage('session'), safeStorage('local')];
  for (const store of stores) {
    if (!store) continue;
    try {
      const raw = store.getItem(SESSION_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { user?: AuthUser; token?: string };
      if (parsed.user && parsed.token) {
        return { user: parsed.user, token: parsed.token };
      }
    } catch {
      /* try the next store */
    }
  }
  return null;
};

function safeStorage(kind: 'session' | 'local'): Storage | null {
  try {
    const store = kind === 'session' ? window.sessionStorage : window.localStorage;
    store.getItem('__jobdev_probe__');
    return store;
  } catch {
    return null;
  }
}

const persistSession = (user: AuthUser | null, token: string | null) => {
  const payload = user && token ? JSON.stringify({ user, token }) : null;
  for (const kind of ['session', 'local'] as const) {
    const store = safeStorage(kind);
    if (!store) continue;
    try {
      if (payload) store.setItem(SESSION_KEY, payload);
      else store.removeItem(SESSION_KEY);
      return;
    } catch {
      /* try the next store */
    }
  }
  // No storage available - in-memory session only.
};

const persisted =
  typeof window !== 'undefined' ? readPersistedSession() : null;

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: persisted?.user ?? null,
  token: persisted?.token ?? null,
  setSession: (user, token) => {
    const nextToken = token ?? get().token;
    persistSession(user, nextToken);
    set({ user, token: nextToken });
  },
  setUser: (user) => {
    persistSession(user, get().token);
    set({ user });
  },
  logout: () => {
    persistSession(null, null);
    set({ user: null, token: null });
  },
}));
