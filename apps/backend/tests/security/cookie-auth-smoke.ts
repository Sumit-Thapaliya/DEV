/** Opt-in real DB/auth integration test. Temporary account is always deleted. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app.js';
import { AppDataSource } from '../../src/database/data-source.js';
import { User, UserRole } from '../../src/modules/user/user.entity.js';
import { cookieOptions, signSession } from '../../src/modules/auth/auth.service.js';
import { env } from '../../src/config/env.js';
async function main() {
  await AppDataSource.initialize();
  const id = randomUUID();
  const repo = AppDataSource.getRepository(User);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const client = axios.create({ baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, validateStatus: () => true });
  try {
    const identifier = `security-${id}@example.invalid`;
    const password = 'CookieTest123!';
    const user = await repo.save(repo.create({ userId: id, email: identifier, mobile: `security-${id}`, password: await bcrypt.hash(password, 10), role: UserRole.CANDIDATE }));
    const csrfResponse = await client.get('/api/auth/csrf');
    const csrf = csrfResponse.data.data.csrfToken;
    const csrfCookie = csrfResponse.headers['set-cookie']![0].split(';')[0];
    const cookies = (session?: string) => `${csrfCookie}${session ? '; jobdev_token=' + session : ''}`;
    const post = (path: string, body: unknown, session?: string, origin = 'http://localhost:3000') => client.post(path, body, { headers: { Cookie: cookies(session), 'X-CSRF-Token': csrf, Origin: origin } });
    assert.equal((await client.get('/api/auth/me')).status, 401);
    assert.equal((await client.post('/api/auth/login', { identifier, password })).status, 403);
    assert.equal((await post('/api/auth/login', { identifier, password }, undefined, 'https://evil.example')).status, 403);
    assert.equal((await client.get('/api/auth/csrf', { headers: { Origin: 'https://evil.example' } })).status, 403);
    assert.equal((await client.post('/api/auth/login', { identifier, password }, { headers: { Cookie: csrfCookie, 'X-CSRF-Token': 'wrong' } })).status, 403);
    assert.equal((await post('/api/auth/login', { identifier, password })).status, 200);
    const login = await post('/api/auth/verify-otp', { identifier, otp: env.STATIC_OTP || '123456' });
    assert.equal(login.status, 200);
    assert.deepEqual(Object.keys(login.data.data), ['user']);
    const setCookie = login.headers['set-cookie']![0];
    assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /SameSite=Lax/i); assert.match(setCookie, /Max-Age=604800/);
    const session = setCookie.split(';')[0].slice('jobdev_token='.length);
    assert.equal((await post('/api/auth/verify-otp', { identifier, otp: env.STATIC_OTP || '123456' })).status, 400);
    const me = await client.get('/api/auth/me', { headers: { Cookie: cookies(session) } });
    assert.equal(me.status, 200); assert.equal(me.headers['cache-control'], 'private, no-store');
    for (const headers of [{ Authorization: `Bearer ${session}` }, { 'x-auth-token': session }]) {
      assert.equal((await client.get('/api/auth/me', { headers })).status, 401);
    }
    assert.equal((await client.get('/api/auth/me?auth_token=' + session)).status, 401);
    const old = jwt.sign({ sub: id, role: user.role }, env.JWT_SECRET);
    assert.equal((await client.get('/api/auth/me', { headers: { Cookie: cookies(old) } })).status, 401);
    assert.equal((await post('/api/auth/logout', {}, session)).status, 200);
    assert.equal((await client.get('/api/auth/me', { headers: { Cookie: cookies(session) } })).status, 401);
    const nextSession = signSession(await repo.findOneByOrFail({ userId: id }));
    const changed = await post('/api/auth/change-password', { currentPassword: password, newPassword: 'NewCookieTest123!' }, nextSession);
    assert.equal(changed.status, 200);
    assert.equal((await client.get('/api/auth/me', { headers: { Cookie: cookies(nextSession) } })).status, 401);
    const newSession = changed.headers['set-cookie']![0].split(';')[0].slice('jobdev_token='.length);
    assert.equal((await client.get('/api/auth/me', { headers: { Cookie: cookies(newSession) } })).status, 200);
    const mode = env.NODE_ENV;
    env.NODE_ENV = 'production'; assert.equal(cookieOptions().secure, true); env.NODE_ENV = mode;
    console.log('PASS: cookie-only login, no token JSON, HttpOnly/SameSite/expiry, CSRF and Origin rejection, legacy/header/query token rejection, OTP single use, logout/password-change revocation, production Secure flag.');
  } finally {
    await repo.delete(id);
    await new Promise<void>(resolve => server.close(() => resolve()));
    await AppDataSource.destroy();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
