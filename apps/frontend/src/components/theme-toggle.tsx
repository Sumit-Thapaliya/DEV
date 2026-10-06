'use client';

import { Moon, Sun } from 'lucide-react';

import { useThemeStore } from '@/store/theme';

/** Light/dark switch with proper icons and a little spin on toggle. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      suppressHydrationWarning
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={
        className ??
        'flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-all hover:scale-110 hover:text-primary-dark'
      }
    >
      {isDark ? (
        <Sun className="h-4 w-4 animate-pop-in text-warning" />
      ) : (
        <Moon className="h-4 w-4 animate-pop-in text-primary" />
      )}
    </button>
  );
}