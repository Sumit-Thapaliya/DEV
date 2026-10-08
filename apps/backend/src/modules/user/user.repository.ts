import { AppDataSource } from '../../database/data-source.js';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { User, UserRole } from './user.entity.js';
import type { CreateUserInput, UpdateUserInput } from './user.types.js';

// Ordinary account requests must not download the original CV, PDF or canvas.
export const accountFields = {
  userId: true,
  role: true,
  sessionVersion: true,
  email: true,
  mobile: true,
  password: true,
  otpHash: true,
  otpExpiry: true,
  isDeleted: true,
  name: true,
  companyName: true,
  aboutCompany: true,
  contactNumber: true,
  avatar: true,
  resumeFileName: true,
  parsedProfile: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class UserRepository {
  private readonly repository = AppDataSource.getRepository(User);

  async findMany(includeDeleted = false) {
    return this.repository.find({
      select: accountFields,
      where: includeDeleted ? {} : { isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async findByRole(role: UserRole, includeDeleted = false) {
    return this.repository.find({
      select: accountFields,
      where: { role, isDeleted: includeDeleted ? undefined : false },
      order: { createdAt: 'DESC' },
    });
  }

  async countByRole(role: UserRole) {
    return this.repository.count({ where: { role, isDeleted: false } });
  }

  async findById(userId: string) {
    return this.repository.findOne({
      where: { userId },
      select: accountFields,
    });
  }

  async findByEmail(email: string) {
    return this.repository.findOne({ where: { email }, select: accountFields });
  }

  async findByMobile(mobile: string) {
    return this.repository.findOne({
      where: { mobile },
      select: accountFields,
    });
  }

  async create(data: CreateUserInput) {
    return this.repository.save(this.repository.create(data));
  }

  async updateOnly(userId: string, data: UpdateUserInput) {
    await this.repository.update(
      userId,
      data as unknown as QueryDeepPartialEntity<User>,
    );
  }

  async update(userId: string, data: UpdateUserInput) {
    /* jsonb columns need one cast: TypeORM's deep-partial mapper does not
       model open record types. */
    await this.repository.update(
      userId,
      data as unknown as QueryDeepPartialEntity<User>,
    );
    return this.repository.findOneOrFail({
      where: { userId },
      select: accountFields,
    });
  }
}
