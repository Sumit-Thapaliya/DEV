import { Router } from 'express';
import { authMiddleware, requireRoles } from '../../middlewares/auth.middleware.js';
import { UserRole } from '../user/user.entity.js';
import {
  createJob,
  deleteJob,
  ingestJobs,
  listJobs,
  listMyJobs,
  updateJobStatus,
} from './job.controller.js';

export const jobRoutes = Router();

jobRoutes.get('/', listJobs);
jobRoutes.get('/mine', authMiddleware, listMyJobs);
jobRoutes.post(
  '/',
  authMiddleware,
  requireRoles(UserRole.RECRUITER, UserRole.ADMIN, UserRole.SUPERADMIN),
  createJob,
);
jobRoutes.patch('/:id/status', authMiddleware, updateJobStatus);
jobRoutes.post('/ingest', ingestJobs);
jobRoutes.delete(
  '/:id',
  authMiddleware,
  requireRoles(UserRole.ADMIN, UserRole.SUPERADMIN),
  deleteJob,
);
