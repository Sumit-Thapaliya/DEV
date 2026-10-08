'use client';

import { Button } from '@/components/ui/button';
import { buildCheck } from '@/lib/api-client';
import { clearLegacyStorage } from '@/lib/clear-legacy-storage';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

/** Deployment changes are offered to the user, never an automatic reload loop. */
const BIRTH_BUILD =
  typeof document !== 'undefined'
    ? (document
        .querySelector('meta[name="app-build"]')
        ?.getAttribute('content') ?? null)
    : null;

export function BuildGuard() {
  const build = useQuery({
    queryKey: ['build'],
    enabled: process.env.NODE_ENV === 'production',
    queryFn: ({ signal }) => buildCheck(signal),
    staleTime: Infinity,
  });
  useEffect(() => {
    clearLegacyStorage();
  }, []);
  if (!BIRTH_BUILD || !build.data?.id || build.data.id === BIRTH_BUILD)
    return null;
  return (
    <aside
      role="status"
      className="fixed bottom-4 right-4 z-[100] flex max-w-sm items-center gap-4 rounded-lg border border-border bg-card p-4 text-sm text-foreground shadow-lg"
    >
      <p>An update is available. Save your work before reloading.</p>
      <Button size="sm" onClick={() => window.location.reload()}>
        Reload to update
      </Button>
    </aside>
  );
}
