'use client';
import { fileAsBase64 } from '@/lib/files';
import { useMutation } from '@tanstack/react-query';

import { FileUp, UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import {
  candidateProfileIncomplete,
  updateProfileRequest,
  uploadResumeRequest,
} from '@/features/auth/api';
import { useSession, useSetSession } from '@/features/auth/queries';

const MAX_RESUME_BYTES = 2 * 1024 * 1024;
const ACCEPTED = '.pdf,.doc,.docx';

/**
 * Blocking modal: a candidate must upload their resume (their profile) before
 * using the dashboard. The dashboard stays visible but blurred behind it,
 * matching the recruiter onboarding gate.
 */
export function CandidateProfileGate() {
  const { data: user } = useSession();
  const setUser = useSetSession();

  const [name, setName] = useState(user?.name ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Please upload your resume');
      const trimmed = name.trim();
      if (trimmed.length >= 2 && trimmed !== user?.name) await updateProfileRequest({ name: trimmed });
      return uploadResumeRequest(file.name, await fileAsBase64(file));
    },
    onSuccess: data => { setUser(data.user); toast({ title: data.atsError ? `Resume saved. ${data.atsError}` : 'Profile complete — welcome aboard!', variant: 'success' }); },
    onError: error => toast({ title: error.message, variant: 'destructive' }),
  });
  const saving = save.isPending;

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!save.isPending) save.mutate();
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
