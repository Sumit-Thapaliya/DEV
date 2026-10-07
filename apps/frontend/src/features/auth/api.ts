import { apiClient } from '@/lib/api-client';

export type UserRole = 'candidate' | 'recruiter' | 'admin' | 'superadmin';

export interface AuthUser {
  id: string;
  identifier: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: UserRole;
  companyName: string | null;
  aboutCompany: string | null;
  contactNumber: string | null;
  avatar: string | null;
  resumeFileName: string | null;
  parsedProfile: Record<string, unknown> | string | null;
  createdAt: string;
}

export interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface RegisterPayload {
  identifier: string;
  password: string;
  role: 'candidate' | 'recruiter';
}

export interface UpdateProfilePayload {
  name?: string;
  companyName?: string;
  aboutCompany?: string | null;
  contactNumber?: string;
  avatar?: string;
  parsedProfile?: string | null;
}

const jsonInit = (body: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function readApiError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiEnvelope<never>;
    return (
      body.message ??
      body.errors?.[0]?.message ??
      `Request failed (${res.status})`
    );
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function registerRequest(payload: RegisterPayload) {
  return apiClient('/api/auth/register', {
    method: 'POST',
    ...jsonInit(payload),
  });
}

export async function loginRequest(identifier: string, password: string) {
  return apiClient('/api/auth/login', {
    method: 'POST',
    ...jsonInit({ identifier, password }),
  });
}

export async function verifyOtpRequest(identifier: string, otp: string) {
  return apiClient('/api/auth/verify-otp', {
    method: 'POST',
    ...jsonInit({ identifier, otp }),
  });
}

export async function meRequest() {
  return apiClient('/api/auth/me');
}

export async function logoutRequest() {
  return apiClient('/api/auth/logout', { method: 'POST' });
}

export async function uploadResumeRequest(
  fileName: string,
  dataBase64: string,
  parsed?: Record<string, unknown> | null,
) {
  /* Extraction now happens server-side (the backend forwards the file to the
     ATS service); only send `parsed` when a caller actually has one. */
  const payload: Record<string, unknown> = { fileName, dataBase64 };
  if (parsed) payload.parsed = parsed;
  return apiClient('/api/auth/resume', {
    method: 'POST',
    ...jsonInit(payload),
  });
}

export async function changePasswordRequest(
  currentPassword: string,
  newPassword: string,
) {
  return apiClient('/api/auth/change-password', {
    method: 'POST',
    ...jsonInit({ currentPassword, newPassword }),
  });
}

export async function updateProfileRequest(payload: UpdateProfilePayload) {
  return apiClient('/api/auth/profile', {
    method: 'PATCH',
    ...jsonInit(payload),
  });
}

export const recruiterProfileIncomplete = (user: AuthUser | null) =>
  !!user &&
  user.role === 'recruiter' &&
  (!user.companyName || !user.contactNumber || !user.avatar);

export const candidateProfileIncomplete = (user: AuthUser | null) =>
  !!user && user.role === 'candidate' && !user.resumeFileName;

export async function logSearchKeywordRequest(keyword: string) {
  return apiClient('/api/auth/search-history', {
    method: 'POST',
    ...jsonInit({ keyword }),
  });
}


export async function formatResumeRequest(fileName: string, dataBase64: string) {
  return apiClient('/api/auth/resume/format', {
    method: 'POST',
    ...jsonInit({ fileName, dataBase64 }),
  });
}

export async function saveResumeDraftRequest(parsedJson: Record<string, unknown>) {
  return apiClient('/api/auth/resume/draft', {
    method: 'POST',
    ...jsonInit({ parsedJson }),
  });
}
