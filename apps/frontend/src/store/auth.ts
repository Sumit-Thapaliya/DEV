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

const readPersistedSession = (): { user: AuthUser; token: string } | null => {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user?: AuthUser; token?: string };
    if (parsed.user && parsed.token) {
      return { user: parsed.user, token: parsed.token };
    }
    return null;
  } catch {
    return null;
  }
};

const persistSession = (user: AuthUser | null, token: string | null) => {
  try {
    if (user && token) {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }));
    } else {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // sessionStorage unavailable - in-memory session only.
  }
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
