import { QueryClient } from '@tanstack/react-query';

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}
let browserClient: QueryClient | undefined;
/** Memory only. No browser persistence or offline credential cache. */
export function getQueryClient() {
  if (typeof window === 'undefined') return createClient();
  return (browserClient ??= createClient());
}
