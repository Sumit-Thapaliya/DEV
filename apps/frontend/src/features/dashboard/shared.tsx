'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { readApiError } from '@/features/auth/api';
import { apiClient } from '@/lib/api-client';

export function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
          <Icon className="h-5 w-5 text-primary" />
        </span>
        <div>
          <p className="text-2xl font-bold leading-tight text-foreground">
            {value}
          </p>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiClient(path);
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const body = await res.json();
  return body.data as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await apiClient(path, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const body = await res.json();
  return body.data as T;
}

export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const res = await apiClient(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const body = await res.json();
  return body.data as T;
}

export async function apiPatch<T>(path: string, payload: unknown): Promise<T> {
  const res = await apiClient(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const body = await res.json();
  return body.data as T;
}

export interface JobRow {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  status: string;
  source: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface UserRow {
  id: string;
  identifier: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: string;
  companyName: string | null;
  createdAt: string;
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
