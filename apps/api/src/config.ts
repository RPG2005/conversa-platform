import { z } from 'zod';

const configSchema = z.object({
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  API_SECRET: z.string().min(32),
  S3_INTERNAL_ENDPOINT: z.url().default('http://object-storage:8333'),
  S3_PUBLIC_ENDPOINT: z.url().default('http://localhost:8333'),
  S3_BUCKET: z.string().min(3).max(63).default('chat-media'),
  S3_ACCESS_KEY: z.string().min(1).default('local-access-key'),
  S3_SECRET_KEY: z.string().min(1).default('local-development-secret'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(24),
  AUTH_RATE_LIMIT: z.coerce.number().int().min(1).max(100).default(5),
  AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(1).max(3_600).default(60),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
});

export type AppConfig = z.infer<typeof configSchema>;

export const loadConfig = (environment: NodeJS.ProcessEnv = process.env): AppConfig => {
  const parsed = configSchema.safeParse(environment);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid application configuration: ${details}`);
  }

  return parsed.data;
};
