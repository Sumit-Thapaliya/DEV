'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { readApiError, verifyOtpRequest, type AuthUser } from '@/features/auth/api';

interface OtpStepProps {
  identifier: string;
  notice: string;
  onVerified: (user: AuthUser, token: string) => void;
  onBack: () => void;
  backLabel: string;
}

export function OtpStep({
  identifier,
  notice,
  onVerified,
  onBack,
  backLabel,
}: OtpStepProps) {
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    otpInputRef.current?.focus();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (otp.length !== 6) {
      toast({ title: 'OTP must be 6 digits', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await verifyOtpRequest(identifier, otp);

      if (!res.ok) {
        toast({ title: await readApiError(res), variant: 'destructive' });
        return;
      }

      const body = await res.json();
      onVerified(body.data.user as AuthUser, body.data.token as string);
    } catch {
      toast({ title: 'Network error. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-pop-in space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-primary-light px-3 py-2.5 text-sm text-primary-dark">
        <KeyRound className="h-4 w-4 shrink-0" />
        <span>
          {notice} <strong>{identifier}</strong>. For testing, use{' '}
          <strong>123456</strong>.
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="otp">One-time password</Label>
        <Input
          id="otp"
          ref={otpInputRef}
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          className="text-center text-lg tracking-[0.5em]"
          autoComplete="one-time-code"
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Verifying…' : 'Verify and continue'}
      </Button>

      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </Button>
    </form>
  );
}
