'use client';

import { toast } from '@/components/ui/use-toast';
import {
  Bell,
  Briefcase,
  Building2,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { redirect, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { logoutRequest, recruiterProfileIncomplete } from '@/features/auth/api';
import { useSession } from '@/features/auth/queries';
import { RecruiterProfileGate } from '@/features/dashboard/recruiter-profile-gate';
import { ApiError, clearCsrf, UNAUTHORIZED_EVENT } from '@/lib/api-client';
import { useThemeEffect } from '@/store/theme';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
  const session = useSession();
  const user = session.data;
  const client = useQueryClient();
  useThemeEffect();
  const logout = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      client.clear();
      clearCsrf();
      router.replace('/login');
    },
    onError: (error) => toast({ title: error.message, variant: 'destructive' }),
  });
  // UI event wiring only. Queries/mutations own all authentication requests.
  useEffect(() => {
    const expired = () => {
      client.clear();
      router.replace('/login');
    };
    const signOut = () => {
      if (!logout.isPending) logout.mutate();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, expired);
    window.addEventListener('jobdev:logout', signOut);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, expired);
      window.removeEventListener('jobdev:logout', signOut);
    };
  }, [client, router, logout.mutate, logout.isPending]);
  const handleLogout = () => { if (!logout.isPending) logout.mutate(); };
  if (session.error instanceof ApiError && session.error.status === 401)
    redirect('/login');
  if (session.isError)
    return (
      <div className="p-8 text-center">
        <p>{session.error.message}</p>
        <button onClick={() => session.refetch()}>Retry connection</button>
      </div>
    );
  if (session.isPending)
    return (
      <div role="status" className="p-8 text-center">
        Loading your account…
      </div>
    );
  if (!user) redirect('/login');

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
                    window.dispatchEvent(
                      new CustomEvent('jobdev:notifications'),
                    )
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
              disabled={logout.isPending}
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
