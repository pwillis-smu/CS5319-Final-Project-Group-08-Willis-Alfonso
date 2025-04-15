import { z } from 'zod';

export const REQUEST_TYPES = {
  REALTIME_TRANSCRIBE: 'REALTIME_TRANSCRIBE',
} as const;

export const RESPONSE_TYPES = {
  ...REQUEST_TYPES,
  ERROR: 'ERROR',
  CONNECTED: 'CONNECTED',
  REALTIME_TRANSCRIBE_PARTIAL: 'REALTIME_TRANSCRIBE_PARTIAL',
} as const;

// Request Schemas
const WSBaseRequestSchema = z.object({
  user: z.string().optional(),
});

export const RealtimeTranscribeRequestSchema = WSBaseRequestSchema.extend({
  sessionId: z.string(),
  message: z.string(),
  type: z.literal('REALTIME_TRANSCRIBE'),
});

export const WSRequestSchema = z.discriminatedUnion('type', [
  RealtimeTranscribeRequestSchema,
]);

// Response Schemas
const WSBaseResponseSchema = z.object({
  user: z.string().optional(),
  sessionId: z.string().optional(),
});

export const RealtimeTranscribeResponseSchema = WSBaseResponseSchema.extend({
  message: z.string(),
  status: z.literal('REALTIME_TRANSCRIBE'),
});

export const RealtimeTranscribePartialResponseSchema = WSBaseResponseSchema.extend({
  message: z.string(),
  status: z.literal('REALTIME_TRANSCRIBE_PARTIAL'),
});

const ErrorResponseSchema = WSBaseResponseSchema.extend({
  message: z.string(),
  status: z.literal('ERROR'),
});

const ConnectedResponseSchema = WSBaseResponseSchema.extend({
  message: z.string(),
  status: z.literal('CONNECTED'),
});

export const WSResponseSchema = z.discriminatedUnion('status', [
  RealtimeTranscribeResponseSchema,
  RealtimeTranscribePartialResponseSchema,
  ErrorResponseSchema,
  ConnectedResponseSchema,
]);

export const requestSchemas = {
  REALTIME_TRANSCRIBE: RealtimeTranscribeRequestSchema,
} as const;

export const responseSchemas = {
  REALTIME_TRANSCRIBE: RealtimeTranscribeResponseSchema,
  ERROR: ErrorResponseSchema,
  CONNECTED: ConnectedResponseSchema,
  REALTIME_TRANSCRIBE_PARTIAL: RealtimeTranscribePartialResponseSchema,
} as const;

export type WSRequest = z.infer<typeof WSRequestSchema>;
export type WSRealtimeTranscribeRequest = z.infer<typeof RealtimeTranscribeRequestSchema>;

export type WSResponse = z.infer<typeof WSResponseSchema>;
export type WSRealtimeTranscribeResponse = z.infer<typeof RealtimeTranscribeResponseSchema>;
export type WSRealtimeTranscribePartialResponse = z.infer<typeof RealtimeTranscribePartialResponseSchema>;