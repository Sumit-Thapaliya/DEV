import 'dotenv/config';
import { z } from 'zod';

const booleanFromEnv = z.enum(['true', 'false']).transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('postgresql://jobdev:jobdev@localhost:5432/jobdev?schema=public'),
  DB_POOL_MIN: z.coerce.number().int().min(0).default(2),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  DB_SSL: booleanFromEnv.default('false'),
  DB_SSL_REJECT_UNAUTHORIZED: booleanFromEnv.default('true'),
  JWT_SECRET: z.string().default('supersecretjwtkey'),
  STATIC_OTP: z.string().default(''),
}).refine(({ DB_POOL_MIN, DB_POOL_MAX }) => DB_POOL_MIN <= DB_POOL_MAX, {
  message: 'DB_POOL_MIN must not exceed DB_POOL_MAX',
  path: ['DB_POOL_MIN'],
});

export const env = schema.parse(process.env);
