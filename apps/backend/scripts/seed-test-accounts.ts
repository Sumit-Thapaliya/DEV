import 'dotenv/config';
import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../src/database/data-source.js';
import { UserRole } from '../src/modules/user/user.entity.js';
import { UserRepository } from '../src/modules/user/user.repository.js';

const RECRUITER_AVATAR =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAZElEQVR4nO3PQQ3AIADAQMAWQvD/wsZE8Lgs6Slo5z53/NnSAa8a0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0D5PvwH56WiCmAAAAABJRU5ErkJggg==';

interface SeedAccount {
  email: string;
  password: string;
  role: UserRole;
  name: string;
  mobile: string;
  companyName?: string;
  contactNumber?: string;
  avatar?: string;
}

const ACCOUNTS: SeedAccount[] = [
  {
    email: 'candidate@jobdev.app',
    password: 'Candidate123',
    role: UserRole.CANDIDATE,
    name: 'Test Candidate',
    mobile: '9800000001',
  },
  {
    email: 'recruiter@jobdev.app',
    password: 'Recruiter123',
    role: UserRole.RECRUITER,
    name: 'Test Recruiter',
    mobile: '9800000002',
    companyName: 'JobDev Recruiters',
    contactNumber: '+977 9800000002',
    avatar: RECRUITER_AVATAR,
  },
  {
    email: 'admin@jobdev.app',
    password: 'Admin12345',
    role: UserRole.ADMIN,
    name: 'Test Admin',
    mobile: '9800000003',
  },
  {
    email: 'superadmin@jobdev.app',
    password: 'Super12345',
    role: UserRole.SUPERADMIN,
    name: 'Test Super Admin',
    mobile: '9800000004',
  },
];

const run = async () => {
  await AppDataSource.initialize();
  const repo = new UserRepository();

  for (const account of ACCOUNTS) {
    const existing = await repo.findByEmail(account.email);
    if (existing) {
      console.log(`exists: ${account.email}`);
      continue;
    }

    const user = await repo.create({
      email: account.email,
      mobile: account.mobile,
      password: await bcrypt.hash(account.password, 10),
      role: account.role,
    });

    await repo.update(user.userId, {
      name: account.name,
      companyName: account.companyName ?? null,
      contactNumber: account.contactNumber ?? null,
      avatar: account.avatar ?? null,
    });

    console.log(`created: ${account.email} / ${account.password} (${account.role})`);
  }

  await AppDataSource.destroy();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
