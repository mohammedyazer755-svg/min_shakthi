import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@minsakthi/contracts';
import { AuthService, type SessionContext } from './service.js';

// Extend Express Request interface
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      sessionContext?: SessionContext;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

const ROLE_RANKS: Record<UserRole, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
};

export function requireAuth(authService: AuthService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header.' });
      return;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Empty access token.' });
      return;
    }

    try {
      const ctx = await authService.verifyAccessToken(token);
      if (!ctx) {
        res.status(401).json({ error: 'TOKEN_EXPIRED_OR_INVALID', message: 'Access token expired or revoked.' });
        return;
      }

      req.sessionContext = ctx;
      next();
    } catch (err) {
      res.status(500).json({ error: 'AUTH_ERROR', message: (err as Error).message });
    }
  };
}

export function requireSiteRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ctx = req.sessionContext;
    if (!ctx) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
      return;
    }

    const userRank = ROLE_RANKS[ctx.role] ?? 0;
    const requiredRank = ROLE_RANKS[minRole] ?? 0;

    if (userRank < requiredRank) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Insufficient permissions. Role "${minRole}" or higher required.`,
      });
      return;
    }

    next();
  };
}

export function requireSiteAccess() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ctx = req.sessionContext;
    if (!ctx) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
      return;
    }

    const targetSiteId = (
      req.params['siteId'] ||
      req.query['siteId'] ||
      req.body?.siteId ||
      req.originalUrl?.match(/\/sites\/([^/?#]+)/)?.[1]
    ) as string | undefined;

    if (targetSiteId && targetSiteId !== ctx.siteId) {
      res.status(403).json({
        error: 'CROSS_SITE_ACCESS_DENIED',
        message: 'Cannot access resources across different tenant sites.',
      });
      return;
    }

    next();
  };
}
