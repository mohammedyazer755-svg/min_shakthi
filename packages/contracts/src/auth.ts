import { z } from 'zod';

export const UserRoleSchema = z.enum(['viewer', 'operator', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  role: UserRoleSchema,
  siteId: z.string().uuid(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: AuthUserSchema,
  expiresInSeconds: z.number().int().positive(),
  csrfToken: z.string().min(1),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RefreshResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: AuthUserSchema,
  expiresInSeconds: z.number().int().positive(),
  csrfToken: z.string().min(1),
});
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

export const UserSessionSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  siteId: z.string().uuid(),
  role: UserRoleSchema,
  expiresAt: z.string().datetime(),
});
export type UserSession = z.infer<typeof UserSessionSchema>;
