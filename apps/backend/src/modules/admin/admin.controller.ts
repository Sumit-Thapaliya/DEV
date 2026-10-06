import type { RequestHandler } from 'express';
import { AdminService, createAdminSchema } from './admin.service.js';
import { toSafeUser } from '../auth/auth.service.js';

const adminService = new AdminService();

export const getStats: RequestHandler = async (_req, res, next) => {
  try {
    const stats = await adminService.getStats();
    res.json({ success: true, data: { stats } });
  } catch (error) {
    next(error);
  }
};

export const listUsers: RequestHandler = async (_req, res, next) => {
  try {
    const users = await adminService.listUsers();
    res.json({ success: true, data: { users } });
  } catch (error) {
    next(error);
  }
};

export const softDeleteUser: RequestHandler = async (req, res, next) => {
  try {
    await adminService.softDeleteUser(req.user!.userId, req.params.id as string);
    res.json({ success: true, data: { message: 'User deleted' } });
  } catch (error) {
    next(error);
  }
};

export const createAdmin: RequestHandler = async (req, res, next) => {
  try {
    const parsed = createAdminSchema.parse(req.body);
    const user = await adminService.createAdmin(parsed);
    res
      .status(201)
      .json({ success: true, data: { user: toSafeUser(user) } });
  } catch (error) {
    next(error);
  }
};
