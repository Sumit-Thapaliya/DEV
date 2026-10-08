'use client';
import { useEffect } from 'react';
import { create } from 'zustand';
type Theme = 'light' | 'dark';
interface ThemeState { theme: Theme; toggleTheme: () => void; }
export const useThemeStore = create<ThemeState>()(set => ({
  theme: 'light',
  toggleTheme: () => set(state => {
    const theme = state.theme === 'light' ? 'dark' : 'light';
    document.cookie = `jobdev-theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    return { theme };
  }),
}));
/** Only a non-sensitive theme preference is JavaScript-readable. Auth is HttpOnly. */
export function useThemeEffect() {
  const theme = useThemeStore(state => state.theme);
  useEffect(() => {
    const saved = document.cookie.split('; ').find(cookie => cookie.startsWith('jobdev-theme='))?.split('=')[1];
    if (saved === 'dark' || saved === 'light') useThemeStore.setState({ theme: saved });
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
}
