export interface HealthDependencies {
  checkDatabase: () => Promise<void>;
  checkRedis: () => Promise<void>;
}

export interface HealthReport {
  status: 'ok' | 'error';
  services: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
  };
}

export const checkHealth = async (dependencies: HealthDependencies): Promise<HealthReport> => {
  const [database, redis] = await Promise.allSettled([
    dependencies.checkDatabase(),
    dependencies.checkRedis(),
  ]);

  const services = {
    database: database.status === 'fulfilled' ? 'ok' : 'error',
    redis: redis.status === 'fulfilled' ? 'ok' : 'error',
  } as const;

  return {
    status: services.database === 'ok' && services.redis === 'ok' ? 'ok' : 'error',
    services,
  };
};
