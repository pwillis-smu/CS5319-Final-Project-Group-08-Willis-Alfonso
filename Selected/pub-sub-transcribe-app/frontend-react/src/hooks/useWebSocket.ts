// src/hooks/useWebSocket.ts
import { useEffect, useCallback, useState, useRef } from "react";
import WebSocketService from "services/WebSocketService";
import { REQUEST_TYPES } from "types/websocket";
import EventBus from "utils/eventBus";
import { TOPICS } from "utils/topics";

export const useWebSocket = (url: string, sessionId: string) => {
  const service = useRef(WebSocketService.getInstance());
  const eventBus = useRef(EventBus.getInstance());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Connect to the WebSocket
    service.current.connect(url, sessionId);

    // Subscribe to WebSocket events
    const connectedUnsubscribe = eventBus.current.subscribe(TOPICS.WS_CONNECTED, () => {
      setIsConnected(true);
      setIsLoading(false);
    });

    const disconnectedUnsubscribe = eventBus.current.subscribe(TOPICS.WS_DISCONNECTED, () => {
      setIsConnected(false);
    });

    const errorUnsubscribe = eventBus.current.subscribe(TOPICS.WS_ERROR, () => {
      setIsLoading(false);
    });

    // Subscribe to audio data to send to server
    const audioDataUnsubscribe = eventBus.current.subscribe(TOPICS.AUDIO_DATA, (data) => {
      sendMessage({
        type: REQUEST_TYPES.REALTIME_TRANSCRIBE,
        sessionId,
        message: data.audioData,
      });
    });

    // Cleanup on unmount
    return () => {
      connectedUnsubscribe();
      disconnectedUnsubscribe();
      errorUnsubscribe();
      audioDataUnsubscribe();
    };
  }, [url, sessionId]);

  const sendMessage = useCallback(
    (data: any) => {
      setIsLoading(true);
      service.current.sendMessage(url, data);
    },
    [url]
  );

  return {
    sendMessage,
    isConnected,
    isLoading
  };
};