import { useState, useEffect, useCallback } from 'react';
import { TOPICS } from 'utils/topics';
import { useEventBus } from './useEventBus';

export interface UseTranscriptionResult {
  transcript: string;
  partialTranscript: string;
  errorMessage: string | null;
  resetTranscript: () => void;
}

export const useTranscription = (): UseTranscriptionResult => {
  const [transcript, setTranscript] = useState<string>('');
  const [partialTranscript, setPartialTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { subscribe } = useEventBus();
  
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setPartialTranscript('');
    setErrorMessage(null);
  }, []);
  
  useEffect(() => {
    const completeUnsubscribe = subscribe(TOPICS.TRANSCRIPTION_COMPLETE, (data) => {
      if (data.message) {
        setTranscript(prev => {
          const newText = prev ? `${prev} ${data.message}` : data.message;
          return newText.trim();
        });
      }
    });
    
    const partialUnsubscribe = subscribe(TOPICS.TRANSCRIPTION_PARTIAL, (data) => {
      if (data.message) {
        setPartialTranscript(data.message);
      }
    });
    
    const errorUnsubscribe = subscribe(TOPICS.TRANSCRIPTION_ERROR, (data) => {
      setErrorMessage(data.message || 'An error occurred during transcription');
    });
    
    const resetUnsubscribe = subscribe(TOPICS.UI_RESET, () => {
      resetTranscript();
    });
    
    return () => {
      completeUnsubscribe();
      partialUnsubscribe();
      errorUnsubscribe();
      resetUnsubscribe();
    };
  }, [subscribe, resetTranscript]);
  
  return {
    transcript,
    partialTranscript,
    errorMessage,
    resetTranscript
  };
};