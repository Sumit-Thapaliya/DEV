import 'dotenv/config';
import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../src/database/data-source.js';
import { UserRole } from '../src/modules/user/user.entity.js';
import { UserRepository } from '../src/modules/user/user.repository.js';

const EMAIL = 'superadmin@jobdev.app';
const PASSWORD = 'Super12345';

const run = async () => {
  await AppDataSource.initialize();
  const repo = new UserRepository();

  const existing = await repo.findByEmail(EMAIL);
  if (existing) {
    console.log(`Super admin already exists (${EMAIL}). Nothing to do.`);
  } else {
    let mobile = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    while (await repo.findByMobile(mobile)) {
      mobile = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    }

    await repo.create({
      email: EMAIL,
      mobile,
      password: await bcrypt.hash(PASSWORD, 10),
      role: UserRole.SUPERADMIN,
    });
    console.log(`Created super admin: ${EMAIL} / ${PASSWORD}`);
  }

  await AppDataSource.destroy();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
