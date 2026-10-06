'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Briefcase,
  Building2,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  logoutRequest,
  recruiterProfileIncomplete,
} from '@/features/auth/api';
import { RecruiterProfileGate } from '@/features/dashboard/recruiter-profile-gate';
import { fetchSessionUser } from '@/lib/api-helpers';
import { UNAUTHORIZED_EVENT } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { useThemeEffect } from '@/store/theme';

const ROLE_LABELS: Record<string, string> = {
  candidate: 'Candidate',
  recruiter: 'Recruiter',
  admin: 'Admin',
  superadmin: 'Super admin',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.logout);
  const [checking, setChecking] = useState(true);
  const [mounted, setMounted] = useState(false);

  useThemeEffect();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      const state = useAuthStore.getState();
      // A fresh session handoff (just after OTP) may race this event; the
      // verifySession fallback already trusts it, so never bounce in that case.
      if (state.user && state.token) {
        return;
      }
      clearUser();
      toast({
        title: 'Session ended. Please log in again.',
        variant: 'destructive',
      });
      router.replace('/login');
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [clearUser, router]);

  useEffect(() => {
    let active = true;

    const verifySession = async () => {
      try {
        const sessionUser = await fetchSessionUser();
        if (!active) return;

        if (sessionUser) {
          setUser(sessionUser);
          setChecking(false);
          return;
        }

        // /me rejected the session. If we just handed off a fresh session
        // (user + token already in the store from signup/login OTP), trust
        // it instead of bouncing to the login page.
        const state = useAuthStore.getState();
        if (state.user && state.token) {
          setChecking(false);
          return;
        }

        router.replace('/login');
      } catch {
        if (!active) return;
        const state = useAuthStore.getState();
        if (state.user && state.token) {
          setChecking(false);
          return;
        }
        toast({
          title: 'Not authenticated. Please log in again.',
          variant: 'destructive',
        });
        router.replace('/login');
      }
    };

    void verifySession();
    return () => {
      active = false;
    };
  }, [router, setUser]);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } finally {
      clearUser();
      toast({ title: 'Logged out', variant: 'success' });
      router.replace('/login');
    }
  };

  if (!mounted || checking || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  const RoleIcon =
    user.role === 'recruiter'
      ? Briefcase
      : user.role === 'candidate'
        ? UserRound
        : Building2;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard">
            <Logo size={34} showTagline={false} />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary-dark">
              {user.role === 'admin' || user.role === 'superadmin' ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <RoleIcon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </span>
            {(user.role === 'candidate' || user.role === 'recruiter') && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent('jobdev:notifications'))
                  }
                  title="Notifications"
                  aria-label="Notifications"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-primary-dark"
                >
                  <Bell className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent('jobdev:view', { detail: 'settings' }),
                    )
                  }
                  title="Settings"
                  aria-label="Settings"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-primary-dark"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </>
            )}
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      {recruiterProfileIncomplete(user) && <RecruiterProfileGate />}
    </div>
  );
}
