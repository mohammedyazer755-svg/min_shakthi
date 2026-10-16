import { z } from 'zod';

export const ApiErrorCodeSchema = z.enum([
  'BAD_REQUEST',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VERSION_CONFLICT',
  'BILLING_NOT_VALIDATED',
  'RATE_LIMITED',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorDetailSchema = z.object({
  code: ApiErrorCodeSchema,
  message: z.string().min(1),
  requestId: z.string().min(1),
  details: z.unknown().optional(),
});
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

export const ApiErrorResponseSchema = z.object({
  error: ApiErrorDetailSchema,
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
