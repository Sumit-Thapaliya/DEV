'use client';

import { useEffect } from 'react';

/**
 * Dev-preview self-heal: client chunks remember the build id of the page
 * that first loaded them. If the dev server has restarted since (new build
 * id), stale chunks would mix with fresh ones and cause impossible bugs -
 * so we force one clean reload.
 */
const BIRTH_BUILD =
  typeof document !== 'undefined'
    ? document
        .querySelector('meta[name="app-build"]')
        ?.getAttribute('content') ?? null
    : null;

export function BuildGuard() {
  useEffect(() => {
    if (!BIRTH_BUILD) return;

    let cancelled = false;
    fetch('/buildcheck', { cache: 'no-store' })
      .then((res) => res.json())
      .then((body: { id?: string }) => {
        if (!cancelled && body.id && body.id !== BIRTH_BUILD) {
          window.location.reload();
        }
      })
      .catch(() => {
        // offline or proxy hiccup - ignore
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
