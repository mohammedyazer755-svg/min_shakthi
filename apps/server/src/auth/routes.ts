import { Router } from 'express';
import { LoginRequestSchema } from '@minsakthi/contracts';
import { AuthService } from './service.js';
import { requireAuth } from './middleware.js';

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  router.post('/login', async (req, res) => {
    const parseResult = LoginRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Invalid email or password format.',
        details: parseResult.error.format(),
      });
      return;
    }

    try {
      const { accessToken, refreshToken, user, expiresInSeconds, csrfToken } =
        await authService.login(parseResult.data);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        accessToken,
        user,
        expiresInSeconds,
        csrfToken,
      });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'INVALID_CREDENTIALS') {
        res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
      } else {
        res.status(500).json({ error: 'AUTH_ERROR', message: msg });
      }
    }
  });

  router.post('/refresh', async (req, res) => {
    const refreshToken = req.cookies?.['refreshToken'];
    if (!refreshToken) {
      res.status(401).json({ error: 'MISSING_REFRESH_COOKIE', message: 'Refresh cookie missing.' });
      return;
    }

    try {
      const { accessToken, refreshToken: newRefreshToken, user, expiresInSeconds, csrfToken } =
        await authService.refresh(refreshToken);

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        accessToken,
        user,
        expiresInSeconds,
        csrfToken,
      });
    } catch (err) {
      res.clearCookie('refreshToken', { path: '/api/v1/auth' });
      res.status(401).json({ error: 'INVALID_REFRESH_TOKEN', message: (err as Error).message });
    }
  });

  router.post('/logout', async (req, res) => {
    const refreshToken = req.cookies?.['refreshToken'];
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    res.status(200).json({ status: 'ok' });
  });

  return router;
}

export function createMeRouter(authService: AuthService): Router {
  const router = Router();
  router.get('/', requireAuth(authService), (req, res) => {
    res.status(200).json({
      user: req.sessionContext?.user,
    });
  });
  return router;
}
