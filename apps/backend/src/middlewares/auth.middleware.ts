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

import { COOKIE_NAME } from '../modules/auth/auth.service.js';
import { parseCookies } from '../common/cookies.js';
export { parseCookies } from '../common/cookies.js';

const userRepo = new UserRepository();

export const authMiddleware: RequestHandler = async (req, _res, next) => {
  try {
    // No bearer, custom-header or URL token fallback, even for previews.
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    if (!token) throw new AppError(401, 'Not authenticated');
    let payload: jwt.JwtPayload;
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'], issuer: 'jobdev-cookie-v2', audience: 'jobdev-web',
      });
      if (typeof decoded === 'string' || !decoded.sub || !Number.isInteger(decoded.ver)) throw new Error('Invalid session');
      payload = decoded;
    } catch {
      throw new AppError(401, 'Session expired. Please log in again.');
    }
    const user = await userRepo.findById(payload.sub!);
    if (!user || user.isDeleted || user.sessionVersion !== payload.ver) throw new AppError(401, 'Session expired. Please log in again.');

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
