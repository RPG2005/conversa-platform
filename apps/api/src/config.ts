import { z } from 'zod';

const configSchema = z.object({
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  API_SECRET: z.string().min(32),
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
