import {
  RealtimeTranscribeRequestSchema,
  RealtimeTranscribeResponseSchema,
} from '../../types/transcription.types';
import { WSHandler } from '../../utils/websocket';
import { RealtimeTranscribeHandler } from './realtimeTranscribe';

export const WSHandlers: Record<string, WSHandler> = {
  REALTIME_TRANSCRIBE: new RealtimeTranscribeHandler(
    RealtimeTranscribeRequestSchema as any,
    RealtimeTranscribeResponseSchema as any,
  ),
};