import { useAuthStore } from '@/store/auth';

export const UNAUTHORIZED_EVENT = 'jobdev:unauthorized';

export const apiClient = (path: string, init?: RequestInit) => {
  const token = useAuthStore.getState().token;
  const headers = new Headers(init?.headers);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(path, { ...init, headers }).then((res) => {
    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    return res;
  });
};
