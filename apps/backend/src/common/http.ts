import axios from 'axios';
export const serviceHttp = axios.create();
/** Bounded server-to-server Axios transport. This never forwards user cookies. */
export async function serviceRequest(url: string, init: RequestInit = {}): Promise<Response> {
  const result = await serviceHttp.request<ArrayBuffer>({
    url, method: init.method ?? 'GET', data: init.body,
    headers: Object.fromEntries(new Headers(init.headers).entries()),
    signal: init.signal ?? undefined, timeout: 30000, maxRedirects: 0,
    maxContentLength: 20_000_000, maxBodyLength: 25_000_000,
    responseType: 'arraybuffer', validateStatus: () => true, transformResponse: [data => data],
  });
  const headers = new Headers();
  for (const [key, value] of Object.entries(result.headers)) if (value != null) headers.set(key, String(value));
  return new Response([204,205,304].includes(result.status) ? null : new Uint8Array(result.data), { status: result.status, headers });
}
