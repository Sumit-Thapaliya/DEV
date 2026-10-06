import { z } from 'zod';

export const identifierSchema = z
  .string()
  .min(3, 'Enter your email or phone number')
  .max(320);

export const registerSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['candidate', 'recruiter']).default('candidate'),
});

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, 'Password is required'),
});

export const verifyOtpSchema = z.object({
  identifier: identifierSchema,
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    companyName: z.string().min(2, 'Company name is too short').max(120).optional(),
    aboutCompany: z
      .string()
      .max(600, 'Keep the company intro under 600 characters')
      .optional()
      .nullable(),
    contactNumber: z
      .string()
      .regex(/^[+]?[0-9\s()-]{7,15}$/, 'Enter a valid contact number')
      .optional(),
    avatar: z.string().max(400_000, 'Profile image is too large').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nothing to update',
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const uploadResumeSchema = z.object({
  fileName: z.string().min(1).max(255),
  dataBase64: z.string().min(1).max(2_800_000, 'Resume file is too large (max 2 MB)'),
  parsed: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type UploadResumeInput = z.infer<typeof uploadResumeSchema>;
