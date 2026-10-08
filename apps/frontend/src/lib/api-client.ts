import axios from 'axios';

export const UNAUTHORIZED_EVENT = 'jobdev:unauthorized';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** One Axios instance; interceptors are registered once, not in React effects. */
export const api = axios.create({
  withCredentials: true,
  timeout: 90_000,
  headers: { 'X-Requested-With': 'JobDev' },
});

// CSRF is a shared in-memory handshake, never an authentication token.
let csrfRequest: Promise<string> | null = null;
export function clearCsrf() {
  csrfRequest = null;
}
function getCsrf() {
  if (!csrfRequest) {
    const pending = api
      .get<{ data: { csrfToken: string } }>('/api/auth/csrf')
      .then(({ data }) => {
        if (typeof data?.data?.csrfToken !== 'string' || !data.data.csrfToken) {
          throw new ApiError(
            'Invalid session verification response. Please retry.',
            502,
          );
        }
        return data.data.csrfToken;
      })
      .catch((error: unknown) => {
        if (csrfRequest === pending) clearCsrf();
        throw error;
      });
    csrfRequest = pending;
  }
  return csrfRequest;
}

api.interceptors.request.use(async (config) => {
  const path = config.url ?? '';
  // Keep cookie/CSRF requests on this origin, including calls made directly via api.
  const url = new URL(path, 'https://jobdev.invalid');
  if (
    config.baseURL ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('\\') ||
    url.origin !== 'https://jobdev.invalid' ||
    (!url.pathname.startsWith('/api/') && url.pathname !== '/buildcheck')
  ) {
    throw new Error('Only same-origin API paths are allowed.');
  }
  if (config.signal?.aborted) throw new axios.CanceledError('Request canceled');

  config.withCredentials = true;
  config.auth = undefined;
  config.headers.delete(['Authorization', 'X-Auth-Token', 'X-CSRF-Token']);
  const method = (config.method ?? 'get').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    // The handshake's GET uses this same client but does not recurse into CSRF.
    config.headers.set('X-CSRF-Token', await getCsrf());
  }
  return config;
});

api.interceptors.response.use(
  (response) => response, // Preserve native AxiosResponse typing and blob support.
  async (error: unknown) => {
    // TanStack Query must receive real cancellation, not a user-facing network error.
    if (axios.isCancel(error) || !axios.isAxiosError(error)) throw error;
    const status = error.response?.status ?? 0;
    let body = error.response?.data;
    // Failed PDF requests still return JSON, delivered as a Blob by Axios.
    if (typeof Blob !== 'undefined' && body instanceof Blob) {
      try {
        body = JSON.parse(await body.text());
      } catch {
        body = undefined;
      }
    }
    const code = typeof body?.code === 'string' ? body.code : undefined;
    if (code === 'CSRF_INVALID') clearCsrf();
    if (status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    // Never replay failed mutations. The next explicit attempt renews CSRF.
    throw new ApiError(
      typeof body?.message === 'string'
        ? body.message
        : status
          ? `Request failed (${status})`
          : 'Cannot reach the server. Check that the backend is running.',
      status,
      code,
    );
  },
);

type Envelope<T> = { data: T };

/** Thin endpoint helpers only; Axios interceptors own all transport policy. */
export async function apiGet<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  return (await api.get<Envelope<T>>(path, { signal })).data.data;
}
export async function apiPost<T>(path: string, data?: unknown): Promise<T> {
  return (await api.post<Envelope<T>>(path, data)).data.data;
}
export async function apiPatch<T>(path: string, data: unknown): Promise<T> {
  return (await api.patch<Envelope<T>>(path, data)).data.data;
}
export async function apiPut<T>(path: string, data: unknown): Promise<T> {
  return (await api.put<Envelope<T>>(path, data)).data.data;
}
export async function apiDelete<T>(path: string): Promise<T> {
  return (await api.delete<Envelope<T>>(path)).data.data;
}
export async function apiBlob(
  path: string,
  signal?: AbortSignal,
): Promise<Blob> {
  return (await api.get<Blob>(path, { responseType: 'blob', signal })).data;
}
export async function buildCheck(signal?: AbortSignal) {
  return (await api.get<{ id?: string }>('/buildcheck', { signal })).data;
}
