export const REQUEST_TYPES = {
  REALTIME_TRANSCRIBE: "REALTIME_TRANSCRIBE",
} as const;

export const RESPONSE_TYPES = {
  ...REQUEST_TYPES,
  ERROR: "ERROR",
  CONNECTED: "CONNECTED",
  REALTIME_TRANSCRIBE_PARTIAL: "REALTIME_TRANSCRIBE_PARTIAL",
} as const;

export type TranscriptionStatus = "idle" | "recording" | "processing" | "completed" | "error";

export type TranscriptionResult = {
  message: string;
};

export type WebSocketRequest = {
  type: keyof typeof REQUEST_TYPES;
  sessionId: string;
  message?: string;
};

export type WebSocketResponse = {
  status: keyof typeof RESPONSE_TYPES;
  message: string;
  sessionId?: string;
};