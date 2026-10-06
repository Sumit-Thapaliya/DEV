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
  formatResumeProxy,
  saveResumeDraft,
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

authRoutes.post('/register', validate(registerSchema), register);
authRoutes.post('/login', validate(loginSchema), login);
authRoutes.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);
authRoutes.get('/me', authMiddleware, getCurrentUser);
authRoutes.post('/logout', authMiddleware, logoutUser);
authRoutes.patch('/profile', authMiddleware, validate(updateProfileSchema), updateProfile);
authRoutes.post('/resume', authMiddleware, validate(uploadResumeSchema), uploadResume);
authRoutes.post('/search-history', authMiddleware, logSearchHistory);
authRoutes.post(
  '/change-password',
  authMiddleware,
  validate(changePasswordSchema),
  changePassword,
);
