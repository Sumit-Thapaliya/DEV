import { useAuthStore } from '@/store/auth';

export const UNAUTHORIZED_EVENT = 'jobdev:unauthorized';

/* Embedded sandbox previews (*.e2b.app) sit behind proxies that do not always
   forward cookies or the Authorization header to the sandbox. On those hosts
   we also hand the token over as a query param so authenticated calls still
   work. Real deployments (localhost, Render) keep clean URLs. */
const isSandboxPreview =
  typeof window !== 'undefined' && window.location.hostname.endsWith('.e2b.app');

export const apiClient = (path: string, init?: RequestInit) => {
  const token = useAuthStore.getState().token;
  const headers = new Headers(init?.headers);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('x-auth-token')) {
      headers.set('x-auth-token', token);
    }
  }

  let url = path;
  if (token && isSandboxPreview) {
    const separator = path.includes('?') ? '&' : '?';
    url = `${path}${separator}auth_token=${encodeURIComponent(token)}`;
  }

  return fetch(url, { ...init, headers }).then((res) => {
    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    return res;
  });
};
