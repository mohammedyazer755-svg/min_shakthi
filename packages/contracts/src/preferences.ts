import { z } from 'zod';

export const UserPreferencesSchema = z.object({
  userId: z.string().uuid(),
  timezone: z.string().default('Asia/Kolkata'),
  preferredDeviceId: z.string().nullable().optional(),
  displayPreferences: z.record(z.string(), z.unknown()).default({}),
  updatedAt: z.string().optional(),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const UpdateUserPreferencesRequestSchema = z.object({
  timezone: z.string().min(1).max(64).optional(),
  preferredDeviceId: z.string().nullable().optional(),
  displayPreferences: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateUserPreferencesRequest = z.infer<typeof UpdateUserPreferencesRequestSchema>;
