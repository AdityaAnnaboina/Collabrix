import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from workspace root (one level up from backend)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  FRONTEND_URL: z.string().url().transform((val) => val.replace(/\/$/, '')),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  REDIS_ENABLED: z.string().optional().default('false'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
