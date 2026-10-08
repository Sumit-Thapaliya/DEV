'use client';
import { useMutation } from '@tanstack/react-query';

import { Briefcase, ShieldCheck, Star, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { loginRequest } from '@/features/auth/api';
import { OtpStep } from '@/features/auth/otp-step';
import { PasswordInput } from '@/features/auth/password-input';
import { useSetSession } from '@/features/auth/queries';

const TEST_ACCOUNTS = [
  {
    icon: UserRound,
    role: 'Candidate',
    email: 'candidate@jobdev.app',
    password: 'Candidate123',
  },
  {
    icon: Briefcase,
    role: 'Recruiter',
    email: 'recruiter@jobdev.app',
    password: 'Recruiter123',
  },
  {
    icon: ShieldCheck,
    role: 'Admin',
    email: 'admin@jobdev.app',
    password: 'Admin12345',
  },
  {
    icon: Star,
    role: 'Super admin',
    email: 'superadmin@jobdev.app',
    password: 'Super12345',
  },
];

export function LoginForm() {
  const router = useRouter();
  const setSession = useSetSession();
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const mutation = useMutation({
    mutationFn: (args: Parameters<typeof loginRequest>) =>
      loginRequest(...args),
  });
  const submitting = mutation.isPending;

  const handleCredentials = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!identifier.trim() || !password) {
      toast({
        title: 'Enter your email/phone and password',
        variant: 'destructive',
      });
      return;
    }

    try {
      await mutation.mutateAsync([identifier.trim(), password]);

      toast({
        title: 'Password verified. Enter the OTP sent to you.',
        variant: 'success',
      });
      router.prefetch('/dashboard');
      setStep('otp');
    } catch (error) {
      toast({ title: (error as Error).message, variant: 'destructive' });
    }
  };

  const fillAccount = (email: string, accountPassword: string) => {
    setIdentifier(email);
    setPassword(accountPassword);
    setStep('credentials');
    toast({ title: 'Credentials filled - press Continue' });
  };

  if (step === 'otp') {
    return (
      <OtpStep
        identifier={identifier.trim()}
        notice="Enter the OTP for"
        backLabel="Back to password"
        onBack={() => setStep('credentials')}
        onVerified={(user) => {
          setSession(user);
          toast({ title: 'Logged in successfully', variant: 'success' });
          router.push('/dashboard');
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCredentials} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="identifier">Email or phone</Label>
          <Input
            id="identifier"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="you@example.com or 98XXXXXXXX"
            autoComplete="username"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Checking…' : 'Continue'}
        </Button>
      </form>

      {process.env.NODE_ENV !== 'production' && (
        <div className="space-y-2">
          <p className="section-label text-center">Quick test accounts</p>
          <div className="grid grid-cols-2 gap-2">
            {TEST_ACCOUNTS.map(({ icon: Icon, role, email, password: pw }) => (
              <button
                key={email}
                type="button"
                suppressHydrationWarning
                onClick={() => fillAccount(email, pw)}
                className="group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                title={`${email} / ${pw} (OTP is 123456)`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-light transition-transform duration-200 group-hover:scale-110">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-foreground">
                    {role}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {email}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Click one to fill the form. OTP for testing: <strong>123456</strong>
          </p>
        </div>
      )}
    </div>
  );
}
