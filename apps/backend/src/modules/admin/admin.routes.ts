import { Router } from 'express';
import { authMiddleware, requireRoles } from '../../middlewares/auth.middleware.js';
import { UserRole } from '../user/user.entity.js';
import {
  createAdmin,
  getStats,
  listUsers,
  softDeleteUser,
} from './admin.controller.js';

export const adminRoutes = Router();

adminRoutes.use(
  authMiddleware,
  requireRoles(UserRole.ADMIN, UserRole.SUPERADMIN),
);

adminRoutes.get('/stats', getStats);
adminRoutes.get('/users', listUsers);
adminRoutes.delete('/users/:id', softDeleteUser);
adminRoutes.post(
  '/admins',
  requireRoles(UserRole.SUPERADMIN),
  createAdmin,
);
