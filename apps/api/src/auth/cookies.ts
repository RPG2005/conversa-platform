import { createHash, randomBytes } from 'node:crypto';

export const sessionCookieName = 'chat_session';

export const createSessionToken = () => randomBytes(32).toString('base64url');

export const hashSessionToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const readSessionToken = (cookieHeader: string | undefined): string | null => {
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${sessionCookieName}=`));
  return cookie ? decodeURIComponent(cookie.slice(sessionCookieName.length + 1)) : null;
};

export const serializeSessionCookie = (token: string, maxAgeSeconds: number, secure: boolean) =>
  `${sessionCookieName}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`;

export const clearSessionCookie = (secure: boolean) =>
  `${sessionCookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
