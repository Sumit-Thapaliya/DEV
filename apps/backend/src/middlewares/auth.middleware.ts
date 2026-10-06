import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../common/errors/AppError.js';
import { env } from '../config/env.js';
import { UserRole } from '../modules/user/user.entity.js';
import { UserRepository } from '../modules/user/user.repository.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: import('../modules/user/user.entity.js').User;
    }
  }
}

const COOKIE_NAME = 'jobdev_token';

export const parseCookies = (header: string | undefined) => {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
};

const userRepo = new UserRepository();

export const authMiddleware: RequestHandler = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;
    const token = bearerToken ?? parseCookies(req.headers.cookie)[COOKIE_NAME];
    if (!token) {
      console.log(
        `[AUTH-DEBUG] no credentials on ${req.method} ${req.originalUrl} (auth header: ${authHeader ? 'present' : 'none'}, cookie: ${req.headers.cookie ? 'present' : 'none'})`,
      );
      throw new AppError(401, 'Not authenticated');
    }

    let payload: { sub: string };
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    } catch (verifyError) {
      console.log(
        `[AUTH-DEBUG] jwt verify failed (${bearerToken ? 'bearer' : 'cookie'}):`,
        verifyError instanceof Error ? verifyError.message : verifyError,
      );
      throw new AppError(401, 'Session expired. Please log in again.');
    }

    const user = await userRepo.findById(payload.sub);
    if (!user || user.isDeleted) {
      console.log(`[AUTH-DEBUG] no user for sub=${payload.sub}`);
      throw new AppError(401, 'Not authenticated');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRoles =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      next(new AppError(401, 'Not authenticated'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'You do not have access to this resource'));
      return;
    }
    next();
  };
