import test, { afterEach } from 'node:test';
import { AxiosHeaders } from 'axios';
import { QueryObserver } from '@tanstack/react-query';
import { api, clearCsrf } from '../src/lib/api-client';
import { sessionKey, sessionQueryOptions } from '../src/features/auth/queries';
import assert from 'node:assert/strict';
import { getQueryClient } from '../src/lib/query-client';

test('deduplicates concurrent reads and reuses a fresh result', async () => {
  const client = getQueryClient();
  let calls = 0;
  const options = {
    queryKey: ['session'],
    queryFn: async () => {
      calls++;
      return { id: 'first' };
    },
  };
  const [first, second] = await Promise.all([
    client.fetchQuery(options),
    client.fetchQuery(options),
  ]);
  assert.equal(first, second);
  await client.fetchQuery(options);
  assert.equal(calls, 1);
  client.clear();
});
test('account keys isolate private data and logout clearing removes it', () => {
  const client = getQueryClient();
  client.setQueryData(['account', 'first', 'resume'], { private: true });
  assert.equal(client.getQueryData(['account', 'second', 'resume']), undefined);
  client.clear();
  assert.equal(client.getQueryCache().getAll().length, 0);
  assert.equal(client.getMutationCache().getAll().length, 0);
});
test('server renders do not share clients; failed writes are never auto-replayed', () => {
  const client = getQueryClient();
  assert.notEqual(client, getQueryClient());
  assert.equal(client.getDefaultOptions().mutations?.retry, false);
  assert.equal(client.getDefaultOptions().queries?.retry, false);
  assert.equal(client.getDefaultOptions().mutations?.gcTime, 0);
});

const originalAdapter = api.defaults.adapter;
afterEach(() => {
  api.defaults.adapter = originalAdapter;
  clearCsrf();
});

test('session observers share the real Axios query and reuse it across screen remounts', async () => {
  const client = getQueryClient();
  let requests = 0;
  api.defaults.adapter = async (config) => {
    requests++;
    assert.equal(config.url, '/api/auth/me');
    return {
      config,
      headers: new AxiosHeaders(),
      status: 200,
      statusText: 'OK',
      data: { data: { user: { id: 'test-account' } } },
    };
  };
  const first = new QueryObserver(client, sessionQueryOptions);
  const second = new QueryObserver(client, sessionQueryOptions);
  const stopFirst = first.subscribe(() => {});
  const stopSecond = second.subscribe(() => {});
  const user = await client.fetchQuery(sessionQueryOptions);
  assert.equal(user.id, 'test-account');
  assert.equal(requests, 1);
  stopFirst();
  stopSecond();
  const third = new QueryObserver(client, sessionQueryOptions);
  const stopThird = third.subscribe(() => {});
  assert.equal(third.getCurrentResult().fetchStatus, 'idle');
  await client.fetchQuery(sessionQueryOptions);
  assert.equal(requests, 1);
  stopThird();
  client.clear();
});

test('OTP-populated session avoids an immediate read, but a fresh cache revalidates', async () => {
  const client = getQueryClient();
  let requests = 0;
  const user = { id: 'otp-account' };
  api.defaults.adapter = async (config) => {
    requests++;
    return {
      config,
      headers: new AxiosHeaders(),
      status: 200,
      statusText: 'OK',
      data: { data: { user } },
    };
  };
  client.setQueryData(sessionKey, user);
  assert.deepEqual(await client.fetchQuery(sessionQueryOptions), user);
  assert.equal(requests, 0);
  // Reloading a document intentionally starts a new memory-only cache.
  const nextDocument = getQueryClient();
  assert.equal(nextDocument.getQueryData(sessionKey), undefined);
  assert.deepEqual(await nextDocument.fetchQuery(sessionQueryOptions), user);
  assert.equal(requests, 1);
  client.clear();
  nextDocument.clear();
});
