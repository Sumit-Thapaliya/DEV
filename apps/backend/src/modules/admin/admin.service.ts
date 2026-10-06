import * as bcrypt from 'bcrypt';
import { z } from 'zod';
import { AppError } from '../../common/errors/AppError.js';
import { toSafeUser } from '../auth/auth.service.js';
import { UserRole } from '../user/user.entity.js';
import { UserRepository } from '../user/user.repository.js';
import { JobRepository } from '../job/job.repository.js';

export const createAdminSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2).max(80).optional(),
});

export class AdminService {
  private userRepo = new UserRepository();
  private jobRepo = new JobRepository();

  async getStats() {
    const [candidates, recruiters, admins, superadmins, jobs] =
      await Promise.all([
        this.userRepo.countByRole(UserRole.CANDIDATE),
        this.userRepo.countByRole(UserRole.RECRUITER),
        this.userRepo.countByRole(UserRole.ADMIN),
        this.userRepo.countByRole(UserRole.SUPERADMIN),
        this.jobRepo.countActive(),
      ]);

    return {
      candidates,
      recruiters,
      admins: admins + superadmins,
      jobs,
    };
  }

  async listUsers() {
    const users = await this.userRepo.findMany();
    return users.map(toSafeUser);
  }

  async softDeleteUser(requesterId: string, targetId: string) {
    const target = await this.userRepo.findById(targetId);
    if (!target || target.isDeleted) {
      throw new AppError(404, 'User not found');
    }
    if (target.userId === requesterId) {
      throw new AppError(409, 'You cannot delete your own account');
    }
    if (target.role === UserRole.ADMIN || target.role === UserRole.SUPERADMIN) {
      throw new AppError(403, 'Admins cannot be deleted from this endpoint');
    }
    await this.userRepo.update(target.userId, { isDeleted: true });
  }

  async createAdmin(input: z.infer<typeof createAdminSchema>) {
    const email = input.email.trim().toLowerCase();
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new AppError(409, 'An account with this email already exists');
    }

    let mobile = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    while (await this.userRepo.findByMobile(mobile)) {
      mobile = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    }

    const user = await this.userRepo.create({
      email,
      mobile,
      password: await bcrypt.hash(input.password, 10),
      role: UserRole.ADMIN,
    });

    if (input.name) {
      return this.userRepo.update(user.userId, { name: input.name });
    }
    return user;
  }
}
