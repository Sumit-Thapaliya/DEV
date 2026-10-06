import type { Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = { title: 'Login' };

export default function LoginPage() {
  return (
    <div className="animate-fade-in-up space-y-6">
      <header className="space-y-2 text-center lg:text-left">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Log in to continue to your dashboard.
        </p>
      </header>

      <LoginForm />

      <p className="text-center text-sm text-muted-foreground">
        New to JobDev?{' '}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
