import type { Metadata } from 'next';
import Link from 'next/link';

import { RegisterForm } from '@/features/auth/register-form';

export const metadata: Metadata = { title: 'Create account' };

interface RegisterPageProps {
  searchParams: Promise<{ role?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const role = params.role === 'recruiter' ? 'recruiter' : 'candidate';

  return (
    <div className="animate-fade-in-up space-y-6">
      <header className="space-y-2 text-center lg:text-left">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Signing up as{' '}
          <span className="font-semibold text-primary">
            {role === 'recruiter' ? 'a recruiter' : 'a candidate'}
          </span>
          .{' '}
          <Link
            href={role === 'recruiter' ? '/register' : '/register?role=recruiter'}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Switch
          </Link>
        </p>
      </header>

      <RegisterForm role={role} />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
