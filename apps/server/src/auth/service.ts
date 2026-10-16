import crypto from 'node:crypto';
import type { AuthUser, LoginRequest, UserRole } from '@minsakthi/contracts';
import { verifyPassword } from '@minsakthi/db';
import { getTelemetryRepository, type ITelemetryRepository } from '../storage/db.js';

const ACCESS_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface SessionContext {
  sessionId: string;
  userId: string;
  siteId: string;
  role: UserRole;
  user: AuthUser;
}

export class AuthService {
  constructor(private readonly repo: ITelemetryRepository = getTelemetryRepository()) {}

  public async login(req: LoginRequest): Promise<{
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
    expiresInSeconds: number;
    csrfToken: string;
  }> {
    const user = await this.repo.getUserByEmail(req.email);
    if (!user || user.disabledAt) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const valid = verifyPassword(req.password, user.passwordHash);
    if (!valid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const defaultMembership = await this.repo.getUserDefaultSite(user.id);
    if (!defaultMembership) {
      throw new Error('NO_ASSIGNED_SITE');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: defaultMembership.role,
      siteId: defaultMembership.siteId,
    };

    const accessToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(16).toString('hex');
    const refreshFamilyId = crypto.randomUUID();

    const now = Date.now();
    const expiresAt = new Date(now + ACCESS_TOKEN_TTL_MS);
    const refreshExpiresAt = new Date(now + REFRESH_TOKEN_TTL_MS);

    await this.repo.createSession({
      userId: user.id,
      accessTokenHash: hashToken(accessToken),
      refreshFamilyId,
      refreshHash: hashToken(refreshToken),
      expiresAt,
      refreshExpiresAt,
    });

    return {
      accessToken,
      refreshToken,
      user: authUser,
      expiresInSeconds: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      csrfToken,
    };
  }

  public async refresh(rawRefreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
    expiresInSeconds: number;
    csrfToken: string;
  }> {
    const tokenHash = hashToken(rawRefreshToken);
    const session = await this.repo.getSessionByRefreshHash(tokenHash);

    if (!session) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // Reuse detection: if token is already revoked, revoke the entire family!
    if (session.revokedAt) {
      await this.repo.revokeSessionFamily(session.refreshFamilyId);
      throw new Error('REVOKED_REFRESH_TOKEN');
    }

    if (new Date() > new Date(session.refreshExpiresAt)) {
      throw new Error('EXPIRED_REFRESH_TOKEN');
    }

    const defaultMembership = await this.repo.getUserDefaultSite(session.userId);
    if (!defaultMembership) {
      throw new Error('NO_ASSIGNED_SITE');
    }

    // Rotate tokens
    const newAccessToken = crypto.randomBytes(32).toString('hex');
    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(16).toString('hex');

    const now = Date.now();
    const expiresAt = new Date(now + ACCESS_TOKEN_TTL_MS);
    const refreshExpiresAt = new Date(now + REFRESH_TOKEN_TTL_MS);

    await this.repo.rotateSession({
      oldSessionId: session.id,
      newAccessTokenHash: hashToken(newAccessToken),
      refreshFamilyId: session.refreshFamilyId,
      newRefreshHash: hashToken(newRefreshToken),
      expiresAt,
      refreshExpiresAt,
    });

    const user = await this.repo.getUserById(session.userId);

    const authUser: AuthUser = {
      id: session.userId,
      email: user?.email ?? 'user@minsakthi.local',
      displayName: user?.displayName ?? 'User',
      role: defaultMembership.role,
      siteId: defaultMembership.siteId,
    };

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: authUser,
      expiresInSeconds: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      csrfToken,
    };
  }

  public async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = hashToken(rawRefreshToken);
    const session = await this.repo.getSessionByRefreshHash(tokenHash);
    if (session) {
      await this.repo.revokeSessionFamily(session.refreshFamilyId);
    }
  }

  public async verifyAccessToken(accessToken: string): Promise<SessionContext | null> {
    const tokenHash = hashToken(accessToken);
    const session = await this.repo.getSessionByAccessTokenHash(tokenHash);
    if (!session || session.revokedAt) {
      return null;
    }

    if (new Date() > new Date(session.expiresAt)) {
      return null;
    }

    const defaultMembership = await this.repo.getUserDefaultSite(session.userId);
    if (!defaultMembership) {
      return null;
    }

    const user = await this.repo.getUserById(session.userId);

    return {
      sessionId: session.id,
      userId: session.userId,
      siteId: defaultMembership.siteId,
      role: defaultMembership.role,
      user: {
        id: session.userId,
        email: user?.email ?? 'user@minsakthi.local',
        displayName: user?.displayName ?? 'User',
        role: defaultMembership.role,
        siteId: defaultMembership.siteId,
      },
    };
  }
}
