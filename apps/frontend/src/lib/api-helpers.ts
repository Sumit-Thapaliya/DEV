import { meRequest, readApiError, type AuthUser } from '@/features/auth/api';
import type { ApiEnvelope } from '@/features/auth/api';

export async function fetchSessionUser(): Promise<AuthUser | null> {
  const res = await meRequest();
  if (!res.ok) return null;
  const body = (await res.json()) as ApiEnvelope<{ user: AuthUser }>;
  return body.data?.user ?? null;
}

export { readApiError };
