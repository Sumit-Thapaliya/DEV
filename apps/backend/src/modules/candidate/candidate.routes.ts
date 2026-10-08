import { recruiterResume } from '../resume/resume.controller.js';
import { Router } from 'express';
import {
  authMiddleware,
  requireRoles,
} from '../../middlewares/auth.middleware.js';
import { UserRole } from '../user/user.entity.js';
import {
  getCandidate,
  getProfileViews,
  getOwnProfileViews,
  recordProfileView,
  listCandidates,
  softDeleteCandidate,
} from './candidate.controller.js';

export const candidateRoutes = Router();

candidateRoutes.use(authMiddleware);
candidateRoutes.get(
  '/views/me',
  requireRoles(UserRole.CANDIDATE),
  getOwnProfileViews,
);
candidateRoutes.use(
  requireRoles(UserRole.RECRUITER, UserRole.ADMIN, UserRole.SUPERADMIN),
);

candidateRoutes.get('/', listCandidates);
candidateRoutes.get(
  '/views',
  requireRoles(UserRole.RECRUITER),
  getProfileViews,
);
candidateRoutes.post(
  '/:id/views',
  requireRoles(UserRole.RECRUITER),
  recordProfileView,
);
candidateRoutes.get('/:id/resume', recruiterResume);
candidateRoutes.get('/:id', getCandidate);
candidateRoutes.delete(
  '/:id',
  requireRoles(UserRole.ADMIN, UserRole.SUPERADMIN),
  softDeleteCandidate,
);
