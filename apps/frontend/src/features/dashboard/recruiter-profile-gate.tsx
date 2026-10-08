'use client';

import { Building2, X } from 'lucide-react';
import { useState } from 'react';

import { recruiterProfileIncomplete } from '@/features/auth/api';
import { useSession, useSetSession } from '@/features/auth/queries';
import { RecruiterProfileForm } from '@/features/dashboard/recruiter-profile-form';

/**
 * Blocking modal: a recruiter cannot use any other page until the company
 * profile (company name, contact number, profile image) is complete. The
 * dashboard stays visible but blurred behind the modal.
 */
export function RecruiterProfileGate() {
  const { data: user } = useSession();
  const setUser = useSetSession();
  const [dismissed, setDismissed] = useState(false);

  if (!user || dismissed || !recruiterProfileIncomplete(user)) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/50 p-4 backdrop-blur-md">
      <div className="animate-pop-in relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl scrollbar-slim">
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
            <Building2 className="h-5 w-5 text-primary" />
          </span>
          <div>
            <h2 className="text-base font-semibold leading-tight text-foreground">
              Complete your profile
            </h2>
            <p className="text-xs text-muted-foreground">
              Required before you can use other pages.
            </p>
          </div>
        </div>

        <RecruiterProfileForm user={user} onSaved={setUser} />
      </div>
    </div>
  );
}
