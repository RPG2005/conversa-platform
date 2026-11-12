import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

const keyLength = 64;
const scryptCost = 16_384;

const deriveKey = (password: string, salt: string, cost: number) =>
  new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, { N: cost }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await deriveKey(password, salt, scryptCost);

  return `scrypt$${scryptCost}$${salt}$${derivedKey.toString('hex')}`;
};

export const verifyPassword = async (password: string, passwordHash: string): Promise<boolean> => {
  const [algorithm, cost, salt, expectedHash] = passwordHash.split('$');
  if (algorithm !== 'scrypt' || !cost || !salt || !expectedHash) return false;

  const expected = Buffer.from(expectedHash, 'hex');
  const derived = await deriveKey(password, salt, Number(cost));

  return expected.length === derived.length && timingSafeEqual(expected, derived);
};
