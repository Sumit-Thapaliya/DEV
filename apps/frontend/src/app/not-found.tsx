import Link from 'next/link';
import { Compass } from 'lucide-react';

import { Logo } from '@/components/logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <Logo size={40} />
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light">
        <Compass className="h-8 w-8 text-primary" />
      </span>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">404</h1>
        <p className="text-lg font-medium text-foreground">
          This page does not exist
        </p>
        <p className="text-sm text-muted-foreground">
          The link may be broken, or the page may have been moved.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Go home
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
