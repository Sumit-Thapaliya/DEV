import { AppDataSource } from '../../database/data-source.js';
import { User, UserRole } from './user.entity.js';
import type { CreateUserInput, UpdateUserInput } from './user.types.js';

export class UserRepository {
  private readonly repository = AppDataSource.getRepository(User);

  async findMany(includeDeleted = false) {
    return this.repository.find({
      where: includeDeleted ? {} : { isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async findByRole(role: UserRole, includeDeleted = false) {
    return this.repository.find({
      where: { role, isDeleted: includeDeleted ? undefined : false },
      order: { createdAt: 'DESC' },
    });
  }

  async countByRole(role: UserRole) {
    return this.repository.count({ where: { role, isDeleted: false } });
  }

  async findById(userId: string) {
    return this.repository.findOneBy({ userId });
  }

  async findByEmail(email: string) {
    return this.repository.findOneBy({ email });
  }

  async findByMobile(mobile: string) {
    return this.repository.findOneBy({ mobile });
  }

  async create(data: CreateUserInput) {
    return this.repository.save(this.repository.create(data));
  }

  async update(userId: string, data: UpdateUserInput) {
    await this.repository.update(userId, data);
    return this.repository.findOneByOrFail({ userId });
  }
}
