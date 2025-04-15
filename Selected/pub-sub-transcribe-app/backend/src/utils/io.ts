import { responseSchemas, RESPONSE_TYPES } from '../types/transcription.types';
import { z } from 'zod';

export const formatWSResponse = <T extends keyof typeof RESPONSE_TYPES>(
  data: z.infer<(typeof responseSchemas)[T]>,
): string => {
  const schema = responseSchemas[data.status as T];
  return JSON.stringify(schema.parse(data));
};

export const formatWSErrResponse = (message: string): string =>
  formatWSResponse<'ERROR'>({ status: RESPONSE_TYPES.ERROR, message: message });