import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { parseCookies } from '../common/cookies.js';

export const CSRF_COOKIE = env.NODE_ENV === 'production' ? '__Host-jobdev_csrf' : 'jobdev_csrf';
export const trustedOrigins = new Set(env.WEB_ORIGINS.split(',').map(value => value.trim()).filter(Boolean));
export const originAllowed = (origin?: string) => !origin || trustedOrigins.has(origin);
const signature = (nonce: string) => createHmac('sha256', env.JWT_SECRET).update(`csrf-v1:${nonce}`).digest('hex');
function validToken(token: string) {
  if (!/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token)) return false;
  const [nonce, mac] = token.split('.');
  return timingSafeEqual(Buffer.from(mac), Buffer.from(signature(nonce)));
}
export const csrfCookieOptions = () => ({ httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 24 * 60 * 60 * 1000 });
export const issueCsrf: RequestHandler = (req, res) => {
  const existing = parseCookies(req.headers.cookie)[CSRF_COOKIE];
  const nonce = randomBytes(32).toString('hex');
  const token = existing && validToken(existing) ? existing : `${nonce}.${signature(nonce)}`;
  res.setHeader('Cache-Control', 'private, no-store');
  res.cookie(CSRF_COOKIE, token, csrfCookieOptions()).json({ success: true, data: { csrfToken: token } });
};
/** Signed double-submit token + explicit Origin allowlist, including login/logout. */
export const csrfProtection: RequestHandler = (req, res, next) => {
  if (!originAllowed(req.get('origin'))) {
    res.status(403).json({ success: false, code: 'ORIGIN_REJECTED', message: 'Request origin is not allowed.' });
    return;
  }
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return; }
  const cookie = parseCookies(req.headers.cookie)[CSRF_COOKIE];
  const header = req.get('X-CSRF-Token');
  if (!cookie || !header || !validToken(cookie) || header.length !== cookie.length ||
      !timingSafeEqual(Buffer.from(header), Buffer.from(cookie))) {
    res.status(403).json({ success: false, code: 'CSRF_INVALID', message: 'Session verification failed. Enable cookies and retry.' });
    return;
  }
  next();
};
