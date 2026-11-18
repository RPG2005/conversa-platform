export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: Date;
}

export interface AuthSessionUser {
  id: string;
  email: string;
  displayName: string;
}

export interface NotificationPreference {
  emailEnabled: boolean;
  updatedAt: Date | null;
}

export interface AuthRepository {
  findUserByEmail: (email: string) => Promise<AuthUser | null>;
  createUser: (input: Omit<AuthUser, 'id' | 'createdAt'>) => Promise<AuthUser | null>;
  createSession: (input: { userId: string; tokenHash: string; expiresAt: Date }) => Promise<void>;
  findSessionUser: (tokenHash: string) => Promise<AuthSessionUser | null>;
  deleteSession: (tokenHash: string) => Promise<void>;
  getNotificationPreference: (userId: string) => Promise<NotificationPreference>;
  updateNotificationPreference: (userId: string, input: { emailEnabled: boolean }) => Promise<NotificationPreference>;
}

export interface AuthRateLimiter {
  consume: (key: string) => Promise<boolean>;
}
