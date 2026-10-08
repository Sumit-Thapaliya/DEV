import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  api,
  ApiError,
  apiGet,
  apiPost,
  apiPatch,
  apiBlob,
  clearCsrf,
  UNAUTHORIZED_EVENT,
} from '../src/lib/api-client';

const originalAdapter = api.defaults.adapter;
afterEach(() => {
  api.defaults.adapter = originalAdapter;
  clearCsrf();
});
function response(
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200,
): AxiosResponse {
  return {
    config,
    data,
    status,
    statusText: String(status),
    headers: new AxiosHeaders(),
  };
}
function fail(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
): never {
  throw new AxiosError(
    'Adapter request failed',
    AxiosError.ERR_BAD_REQUEST,
    config,
    undefined,
    response(config, data, status),
  );
}

test('native interceptors share one CSRF handshake and enforce cookies on concurrent writes', async () => {
  let handshakes = 0;
  const writes: InternalAxiosRequestConfig[] = [];
  api.defaults.adapter = async (config) => {
    if (config.url === '/api/auth/csrf') {
      handshakes++;
      await Promise.resolve();
      return response(config, { data: { csrfToken: 'test-csrf-nonce' } });
    }
    writes.push(config);
    return response(config, { data: { saved: true } });
  };
  await Promise.all([
    api.post(
      '/api/auth/profile',
      {},
      {
        withCredentials: false,
        auth: { username: 'forbidden', password: 'forbidden' },
        headers: {
          Authorization: 'Bearer forbidden',
          'X-Auth-Token': 'forbidden',
          'X-CSRF-Token': 'untrusted',
          'X-Request-ID': 'keep-this-header',
        },
      },
    ),
    apiPatch('/api/auth/profile', { name: 'Test' }),
  ]);
  assert.equal(handshakes, 1);
  assert.equal(writes.length, 2);
  for (const config of writes) {
    assert.equal(config.withCredentials, true);
    assert.equal(config.auth, undefined);
    assert.equal(config.headers.get('Authorization'), undefined);
    assert.equal(config.headers.get('X-Auth-Token'), undefined);
    assert.equal(config.headers.get('X-CSRF-Token'), 'test-csrf-nonce');
    assert.equal(config.headers.get('Content-Type'), 'application/json');
  }
  assert.equal(writes[0].headers.get('X-Request-ID'), 'keep-this-header');
});

test('reads do not issue a CSRF handshake and keep typed JSON/blob results', async () => {
  const requests: string[] = [];
  const pdf = new Blob(['%PDF-test'], { type: 'application/pdf' });
  api.defaults.adapter = async (config) => {
    requests.push(config.url!);
    assert.equal(config.withCredentials, true);
    assert.equal(config.headers.get('X-CSRF-Token'), undefined);
    return response(
      config,
      config.responseType === 'blob' ? pdf : { data: { jobs: [] } },
    );
  };
  assert.deepEqual(await apiGet('/api/jobs'), { jobs: [] });
  assert.equal(await apiBlob('/api/candidates/test/resume'), pdf);
  assert.deepEqual(requests, ['/api/jobs', '/api/candidates/test/resume']);
});

test('request interceptor rejects external URLs, baseURL overrides and normalized non-API paths', async () => {
  let dispatched = 0;
  api.defaults.adapter = async (config) => {
    dispatched++;
    return response(config, {});
  };
  for (const url of [
    'https://example.invalid/api/jobs',
    '//example.invalid/api/jobs',
    '/api/../outside',
    '/api/\\outside',
  ]) {
    await assert.rejects(api.get(url), /Only same-origin/);
  }
  await assert.rejects(
    api.get('/api/jobs', { baseURL: 'https://example.invalid' }),
    /Only same-origin/,
  );
  assert.equal(dispatched, 0);
});

test('CSRF rejection never replays a write; the next explicit attempt renews its handshake', async () => {
  let handshakes = 0,
    writes = 0;
  api.defaults.adapter = async (config) => {
    if (config.url === '/api/auth/csrf')
      return response(config, { data: { csrfToken: `csrf-${++handshakes}` } });
    writes++;
    if (writes === 1)
      fail(config, 403, {
        code: 'CSRF_INVALID',
        message: 'Please retry verification.',
      });
    assert.equal(config.headers.get('X-CSRF-Token'), 'csrf-2');
    return response(config, { data: { saved: true } });
  };
  await assert.rejects(
    apiPost('/api/auth/profile', {}),
    (error) =>
      error instanceof ApiError &&
      error.status === 403 &&
      error.code === 'CSRF_INVALID',
  );
  assert.equal(writes, 1);
  assert.equal(handshakes, 1);
  assert.deepEqual(await apiPost('/api/auth/profile', {}), { saved: true });
  assert.equal(writes, 2);
  assert.equal(handshakes, 2);
});

test('failed CSRF handshake does not send the mutation and can be explicitly retried', async () => {
  let handshakes = 0,
    writes = 0;
  api.defaults.adapter = async (config) => {
    if (config.url === '/api/auth/csrf') {
      if (++handshakes === 1) fail(config, 503, { message: 'Unavailable' });
      return response(config, { data: { csrfToken: 'test-nonce' } });
    }
    writes++;
    return response(config, { data: { saved: true } });
  };
  await assert.rejects(
    apiPost('/api/auth/profile', {}),
    (error) => error instanceof ApiError && error.status === 503,
  );
  assert.equal(writes, 0);
  await apiPost('/api/auth/profile', {});
  assert.equal(handshakes, 2);
  assert.equal(writes, 1);
});

test('malformed CSRF response fails closed before the write', async () => {
  let writes = 0;
  api.defaults.adapter = async (config) => {
    if (config.url === '/api/auth/csrf') return response(config, { data: {} });
    writes++;
    return response(config, {});
  };
  await assert.rejects(
    apiPost('/api/auth/profile', {}),
    (error) => error instanceof ApiError && error.status === 502,
  );
  assert.equal(writes, 0);
});

test('cancellation remains an Axios cancellation and an already-aborted read is not dispatched', async () => {
  let dispatched = 0;
  api.defaults.adapter = async (config) => {
    dispatched++;
    throw new axios.CanceledError('Canceled by query', config);
  };
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(apiGet('/api/jobs', controller.signal), axios.isCancel);
  assert.equal(dispatched, 0);
  await assert.rejects(apiGet('/api/jobs'), axios.isCancel);
  assert.equal(dispatched, 1);
});

test('PDF errors are decoded from JSON blobs rather than hiding the API message', async () => {
  api.defaults.adapter = async (config) =>
    fail(
      config,
      403,
      new Blob(
        [
          JSON.stringify({
            message: 'Recruiter access required',
            code: 'ROLE_REQUIRED',
          }),
        ],
        { type: 'application/json' },
      ),
    );
  await assert.rejects(
    apiBlob('/api/candidates/test/resume'),
    (error) =>
      error instanceof ApiError &&
      error.message === 'Recruiter access required' &&
      error.code === 'ROLE_REQUIRED',
  );
});

test('401 notification is emitted by the response interceptor, not by endpoint helpers', async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const events: string[] = [];
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { dispatchEvent: (event: Event) => events.push(event.type) },
  });
  try {
    api.defaults.adapter = async (config) =>
      fail(config, 401, { message: 'Not authenticated' });
    await assert.rejects(
      apiGet('/api/auth/me'),
      (error) => error instanceof ApiError && error.status === 401,
    );
    assert.deepEqual(events, [UNAUTHORIZED_EVENT]);
  } finally {
    if (originalWindow)
      Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('connection failures have one consistent actionable error shape', async () => {
  api.defaults.adapter = async (config) => {
    throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
  };
  await assert.rejects(
    apiGet('/api/auth/me'),
    (error) =>
      error instanceof ApiError &&
      error.status === 0 &&
      error.message.includes('backend is running'),
  );
});
