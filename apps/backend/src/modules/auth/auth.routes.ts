import { issueCsrf } from '../../middlewares/csrf.middleware.js';
import { authRateLimiter } from '../../middlewares/rateLimiter.js';
import { saveCurrentResume } from '../resume/resume.controller.js';
import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.js';
import {
  changePassword,
  getCurrentUser,
  login,
  logoutUser,
  register,
  updateProfile,
  uploadResume,
  getSavedResume,
  logSearchHistory,
  verifyOtp,
} from './auth.controller.js';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
  uploadResumeSchema,
  verifyOtpSchema,
} from './auth.schema.js';

export const authRoutes = Router();

authRoutes.get('/csrf', issueCsrf);
authRoutes.post('/register', authRateLimiter, validate(registerSchema), register);
authRoutes.post('/login', authRateLimiter, validate(loginSchema), login);
authRoutes.post('/verify-otp', authRateLimiter, validate(verifyOtpSchema), verifyOtp);
authRoutes.get('/me', authMiddleware, getCurrentUser);
authRoutes.post('/logout', authMiddleware, logoutUser);
authRoutes.patch('/profile', authMiddleware, validate(updateProfileSchema), updateProfile);
authRoutes.put('/resume/current', authMiddleware, saveCurrentResume);
authRoutes.get('/resume', authMiddleware, getSavedResume);
authRoutes.post('/resume', authMiddleware, validate(uploadResumeSchema), uploadResume);
authRoutes.post('/search-history', authMiddleware, logSearchHistory);
authRoutes.post(
  '/change-password',
  authMiddleware,
  validate(changePasswordSchema),
  changePassword,
);
