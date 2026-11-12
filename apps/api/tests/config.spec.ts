import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const validEnvironment = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/chat_yes_no',
  REDIS_URL: 'redis://:password@localhost:6379',
  API_SECRET: 'a-very-long-local-secret-with-at-least-32-characters',
};

describe('loadConfig', () => {
  it('loads valid configuration and defaults server settings', () => {
    expect(loadConfig(validEnvironment)).toMatchObject({
      ...validEnvironment,
      HOST: '0.0.0.0',
      PORT: 3000,
    });
  });

  it.each(['DATABASE_URL', 'REDIS_URL', 'API_SECRET'] as const)(
    'rejects configuration without %s',
    (field) => {
      const environment = { ...validEnvironment };
      delete environment[field];

      expect(() => loadConfig(environment)).toThrow('Invalid application configuration');
    },
  );
});
