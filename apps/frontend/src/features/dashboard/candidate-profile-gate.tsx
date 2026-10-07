'use client';

import { useRef, useState } from 'react';
import { FileUp, UploadCloud, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import {
  candidateProfileIncomplete,
  readApiError,
  updateProfileRequest,
  uploadResumeRequest,
  type AuthUser,
} from '@/features/auth/api';
import { useAuthStore } from '@/store/auth';

const MAX_RESUME_BYTES = 2 * 1024 * 1024;
const ACCEPTED = '.pdf,.doc,.docx';

/**
 * Blocking modal: a candidate must upload their resume (their profile) before
 * using the dashboard. The dashboard stays visible but blurred behind it,
 * matching the recruiter onboarding gate.
 */
export function CandidateProfileGate() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [name, setName] = useState(user?.name ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user || dismissed || !candidateProfileIncomplete(user)) {
    return null;
  }

  const handlePick = (picked: File | null) => {
    if (!picked) return;
    if (!/\.(pdf|docx?)$/i.test(picked.name)) {
      toast({ title: 'Choose a PDF or Word document', variant: 'destructive' });
      return;
    }
    if (picked.size > MAX_RESUME_BYTES) {
      toast({ title: 'Resume must be under 2 MB', variant: 'destructive' });
      return;
    }
    setFile(picked);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({ title: 'Please upload your resume', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const trimmed = name.trim();
      if (trimmed && trimmed.length >= 2 && trimmed !== user.name) {
        const nameRes = await updateProfileRequest({ name: trimmed });
        if (!nameRes.ok) {
          toast({ title: await readApiError(nameRes), variant: 'destructive' });
          return;
        }
      }

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.split(',')[1] ?? '';

      /* The backend forwards the file to the ATS extraction service and
         stores the parsed profile on the account; nothing to do client-side. */
      const res = await uploadResumeRequest(file.name, base64);
      if (!res.ok) {
        toast({ title: await readApiError(res), variant: 'destructive' });
        return;
      }
      const body = (await res.json()) as { data: { user: AuthUser } };
      setUser(body.data.user);
      toast({ title: 'Profile complete — welcome aboard!', variant: 'success' });
    } catch {
      toast({ title: 'Network error. Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/50 p-4 backdrop-blur-md">
      <div className="animate-pop-in relative w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          title="for testing only"
          className="absolute right-3 top-3 flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          for testing only
        </button>
        <div className="mb-4 flex items-center gap-3 pr-24">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light">
            <UploadCloud className="h-5 w-5 text-primary" />
          </span>
          <div>
            <h2 className="text-base font-semibold leading-tight text-foreground">
              Upload your profile
            </h2>
            <p className="text-xs text-muted-foreground">
              Add your resume before browsing jobs.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gate-name">Your name</Label>
            <Input
              id="gate-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              autoComplete="name"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Resume</Label>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(event) => handlePick(event.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-background/60 px-4 py-4 text-left transition-colors hover:border-primary/60"
            >
              <FileUp className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">
                  {file ? file.name : 'Choose your resume'}
                </span>
                <span className="block text-xs text-muted-foreground">
                  PDF or Word, up to 2 MB
                </span>
              </span>
            </button>
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving…' : 'Save and continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}
