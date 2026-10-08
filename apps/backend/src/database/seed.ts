import { env } from '../config/env.js';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from './data-source.js';
import { User, UserRole } from '../modules/user/user.entity.js';

/**
 * Shared team test accounts. Created ONLY when the users table is completely
 * empty (fresh local DBs, fresh team clones) so real environments are never
 * touched. OTP for all of them in dev is 123456.
 */
const ACCOUNTS = [
  {
    email: 'candidate@jobdev.app',
    mobile: '9800000001',
    password: 'Candidate123',
    role: UserRole.CANDIDATE,
    name: 'Test Candidate',
  },
  {
    email: 'recruiter@jobdev.app',
    mobile: '9800000002',
    password: 'Recruiter123',
    role: UserRole.RECRUITER,
    name: 'Test Recruiter',
    /* companyName / contactNumber / avatar intentionally NOT seeded so the
       blocking company-profile gate is visible on first login. */
  },
  {
    email: 'admin@jobdev.app',
    mobile: '9800000003',
    password: 'Admin12345',
    role: UserRole.ADMIN,
    name: 'Test Admin',
  },
  {
    email: 'superadmin@jobdev.app',
    mobile: '9800000004',
    password: 'Super12345',
    role: UserRole.SUPERADMIN,
    name: 'Test Super Admin',
  },
];

export async function seedTestAccounts(): Promise<void> {
  if (env.NODE_ENV === 'production') return;
  const repository = AppDataSource.getRepository(User);
  if ((await repository.count()) > 0) return;

  for (const account of ACCOUNTS) {
    const { password, ...rest } = account;
    await repository.save(
      repository.create({ ...rest, password: await bcrypt.hash(password, 10) }),
    );
  }
  console.log('Seeded shared test accounts (OTP 123456 in dev)');
}
