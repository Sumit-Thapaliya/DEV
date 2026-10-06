import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../../common/errors/AppError.js';
import { env } from '../../config/env.js';
import { User, UserRole } from '../user/user.entity.js';
import { UserRepository } from '../user/user.repository.js';
import type {
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  VerifyOtpInput,
} from './auth.schema.js';

export const COOKIE_NAME = 'jobdev_token';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const OTP_TTL_MS = 10 * 60 * 1000;
const TESTING_OTP = '123456';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmailIdentifier = (identifier: string) =>
  EMAIL_PATTERN.test(identifier.trim());

export const normalizePhone = (identifier: string) =>
  identifier.replace(/[\s()-]/g, '');

const randomDigits = (length: number) => {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(Math.random() * 10).toString();
  }
  return out;
};

export const toSafeUser = (user: User) => ({
  id: user.userId,
  identifier: user.email ?? user.mobile,
  email: user.email,
  phone: user.mobile,
  name: user.name,
  role: user.role.toLowerCase(),
  companyName: user.companyName,
  aboutCompany: user.aboutCompany ?? null,
  contactNumber: user.contactNumber,
  avatar: user.avatar,
  resumeFileName: user.resumeFileName ?? null,
  parsedProfile: user.parsedProfile ?? null,
  createdAt: user.createdAt,
});

export const signSession = (user: User) =>
  jwt.sign({ sub: user.userId, role: user.role }, env.JWT_SECRET, {
    expiresIn: SESSION_TTL_SECONDS,
  });

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
});

export class AuthService {
  private userRepo = new UserRepository();

  private async findByIdentifier(identifier: string) {
    return isEmailIdentifier(identifier)
      ? this.userRepo.findByEmail(identifier.trim().toLowerCase())
      : this.userRepo.findByMobile(normalizePhone(identifier));
  }

  private async issueOtp(user: User) {
    const otp =
      env.STATIC_OTP.length > 0
        ? env.STATIC_OTP
        : env.NODE_ENV === 'production'
          ? randomDigits(6)
          : TESTING_OTP;
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + OTP_TTL_MS);
    await this.userRepo.update(user.userId, { otpHash, otpExpiry });
    console.log(`[AUTH] OTP for ${user.email ?? user.mobile}: ${otp}`);
  }

  async register(input: RegisterInput) {
    const role =
      input.role === 'recruiter' ? UserRole.RECRUITER : UserRole.CANDIDATE;

    let email: string | null = null;
    let mobile: string;

    if (isEmailIdentifier(input.identifier)) {
      email = input.identifier.trim().toLowerCase();
      if (await this.userRepo.findByEmail(email)) {
        throw new AppError(409, 'An account with this email already exists');
      }
      mobile = randomDigits(10);
      while (await this.userRepo.findByMobile(mobile)) {
        mobile = randomDigits(10);
      }
    } else {
      mobile = normalizePhone(input.identifier);
      if (await this.userRepo.findByMobile(mobile)) {
        throw new AppError(409, 'An account with this phone already exists');
      }
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const user = await this.userRepo.create({
      email,
      mobile,
      password: hashedPassword,
      role,
    });

    await this.issueOtp(user);
    return user;
  }

  async startLogin(input: LoginInput) {
    const user = await this.findByIdentifier(input.identifier);
    if (!user || user.isDeleted) {
      throw new AppError(401, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(input.password, user.password);
    if (!isMatch) {
      throw new AppError(401, 'Invalid email or password');
    }

    await this.issueOtp(user);
    return { identifier: user.email ?? user.mobile };
  }

  async verifyOtp(input: VerifyOtpInput) {
    const user = await this.findByIdentifier(input.identifier);
    if (!user || user.isDeleted || !user.otpHash || !user.otpExpiry) {
      throw new AppError(400, 'Invalid or expired OTP');
    }

    if (user.otpExpiry.getTime() < Date.now()) {
      await this.userRepo.update(user.userId, { otpHash: null, otpExpiry: null });
      throw new AppError(400, 'Invalid or expired OTP');
    }

    const isMatch = await bcrypt.compare(input.otp, user.otpHash);
    if (!isMatch) {
      throw new AppError(400, 'Invalid or expired OTP');
    }

    await this.userRepo.update(user.userId, { otpHash: null, otpExpiry: null });
    return user;
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await this.userRepo.findById(userId);
    if (!user || user.isDeleted) {
      throw new AppError(404, 'User not found');
    }
    return this.userRepo.update(userId, { ...input });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepo.findById(userId);
    if (!user || user.isDeleted) {
      throw new AppError(404, 'User not found');
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError(400, 'Current password is incorrect');
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(userId, { password: hashed });
    return true;
  }

  async uploadResume(
    userId: string,
    fileName: string,
    dataBase64: string,
    parsed?: Record<string, unknown> | null,
  ) {
    const user = await this.userRepo.findById(userId);
    if (!user || user.isDeleted) {
      throw new AppError(404, 'User not found');
    }
    return this.userRepo.update(userId, {
      resumeFileName: fileName,
      resumeData: dataBase64,
      resumeUploadedAt: new Date(),
      parsedProfile: parsed ? JSON.stringify(parsed) : null,
    });
  }
}
