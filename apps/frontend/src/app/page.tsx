import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Briefcase, UserRound } from 'lucide-react';

import { Logo } from '@/components/logo';
import { ThemeEffectMount } from '@/components/theme-effect-mount';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = { title: 'Welcome' };

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ThemeEffectMount />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Logo size={38} />
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-4 pb-20 text-center">
        <h1 className="animate-fade-in-up text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Get hired faster with{' '}
          <span className="text-primary">JobDev</span>
        </h1>
        <p className="animate-fade-in-up max-w-xl text-base text-muted-foreground">
          One platform for candidates and recruiters. Create your account,
          complete your profile and start connecting today.
        </p>

        <div className="animate-fade-in-up grid w-full gap-3 sm:grid-cols-2">
          <Link
            href="/register"
            className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary"
          >
            <div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
                <UserRound className="h-5 w-5 text-primary" />
              </span>
              <p className="mt-3 font-semibold text-foreground">
                I am a candidate
              </p>
              <p className="text-sm text-muted-foreground">
                Find and apply for jobs
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </Link>

          <Link
            href="/register?role=recruiter"
            className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary"
          >
            <div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
                <Briefcase className="h-5 w-5 text-primary" />
              </span>
              <p className="mt-3 font-semibold text-foreground">
                I am a recruiter
              </p>
              <p className="text-sm text-muted-foreground">
                Post roles and hire talent
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        </div>

        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </p>
      </main>
    </div>
  );
}
