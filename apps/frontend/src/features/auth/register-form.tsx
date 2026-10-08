'use client';
import { useMutation } from '@tanstack/react-query';

import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerRequest } from '@/features/auth/api';
import { OtpStep } from '@/features/auth/otp-step';
import { PasswordInput } from '@/features/auth/password-input';
import { useSetSession } from '@/features/auth/queries';

interface RegisterFormProps {
  role: 'candidate' | 'recruiter';
}

export function RegisterForm({ role }: RegisterFormProps) {
  const router = useRouter();
  const setSession = useSetSession();
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const mutation = useMutation({
    mutationFn: (args: Parameters<typeof registerRequest>) =>
      registerRequest(...args),
  });
  const submitting = mutation.isPending;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!identifier.trim()) {
      toast({
        title: 'Enter your email or phone number',
        variant: 'destructive',
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    try {
      await mutation.mutateAsync([
        {
          identifier: identifier.trim(),
          password,
          role,
        },
      ]);

      toast({
        title: 'Account created. Now verify the OTP.',
        variant: 'success',
      });
      router.prefetch('/dashboard');
      setStep('otp');
    } catch (error) {
      toast({ title: (error as Error).message, variant: 'destructive' });
    }
  };

  if (step === 'otp') {
    return (
      <OtpStep
        identifier={identifier.trim()}
        notice="Account created for"
        backLabel="Back to details"
        onBack={() => setStep('details')}
        onVerified={(user) => {
          setSession(user);
          toast({ title: 'Verified. Welcome to JobDev!', variant: 'success' });
          router.push('/dashboard');
        }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          placeholder="At least 6 characters"
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm password</Label>
        <PasswordInput
          id="confirm-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat your password"
          autoComplete="new-password"
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
