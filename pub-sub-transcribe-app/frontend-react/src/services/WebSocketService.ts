import { RESPONSE_TYPES } from "types/websocket";
import EventBus from "utils/eventBus";
import { TOPICS } from "utils/topics";

class WebSocketService {
  private sessionId: string | null = null;
  private static instance: WebSocketService | null = null;
  private connections: Map<string, WebSocket> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private messageQueues: Map<string, any[]> = new Map();
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private eventBus: EventBus;

  private constructor() {
    this.eventBus = EventBus.getInstance();
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public connect(url: string, sessionId: string): void {
    if (!this.connections.has(url) && sessionId) {
      this.sessionId = sessionId;
      this.messageQueues.set(url, []);
      this.createConnection(url);
    }
  }

  public sendMessage(url: string, data: any): void {
    try {
      const ws = this.connections.get(url);
      
      if (this.sessionId && !data.sessionId) {
        data.sessionId = this.sessionId;
      }
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      } else {
        const queue = this.messageQueues.get(url) || [];
        queue.push(data);
        this.messageQueues.set(url, queue);

        if (!ws || ws.readyState !== WebSocket.CONNECTING) {
          this.createConnection(url);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      this.eventBus.publish(TOPICS.WS_ERROR, {
        message: "Error sending message",
        error
      });
    }
  }

  public closeConnection(url: string): void {
    const ws = this.connections.get(url);
    if (ws) {
      ws.close(1000, "Connection closed by client");
      this.connections.delete(url);
    }

    const timeout = this.reconnectTimeouts.get(url);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(url);
    }

    const pingInterval = this.pingIntervals.get(url);
    if (pingInterval) {
      clearInterval(pingInterval);
      this.pingIntervals.delete(url);
    }
  }

  private createConnection(url: string): void {
    try {
      const existingWs = this.connections.get(url);
      if (existingWs?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(url);
      this.connections.set(url, ws);

      ws.onopen = () => {
        this.eventBus.publish(TOPICS.WS_CONNECTED, { url });

        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "PING" }));
          }
        }, 25000);

        this.pingIntervals.set(url, pingInterval);

        const queue = this.messageQueues.get(url) || [];
        while (queue.length > 0) {
          const message = queue.shift();
          if (message && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
          }
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data: any = JSON.parse(event.data);
          
          if (data.status) {
            switch (data.status) {
              case RESPONSE_TYPES.REALTIME_TRANSCRIBE:
                this.eventBus.publish(TOPICS.TRANSCRIPTION_COMPLETE, data);
                break;
              case RESPONSE_TYPES.REALTIME_TRANSCRIBE_PARTIAL:
                this.eventBus.publish(TOPICS.TRANSCRIPTION_PARTIAL, data);
                break;
              case RESPONSE_TYPES.ERROR:
                this.eventBus.publish(TOPICS.TRANSCRIPTION_ERROR, data);
                break;
              case RESPONSE_TYPES.CONNECTED:
                break;
              default:
                console.log("Unhandled message type:", data.status);
            }
          }
        } catch (error) {
          this.eventBus.publish(TOPICS.WS_ERROR, {
            message: "Error processing message",
            error
          });
        }
      };

      ws.onclose = (event) => {
        this.eventBus.publish(TOPICS.WS_DISCONNECTED, {
          code: event.code,
          reason: event.reason,
          url
        });

        const pingInterval = this.pingIntervals.get(url);
        if (pingInterval) {
          clearInterval(pingInterval);
          this.pingIntervals.delete(url);
        }

        if (event.code !== 1000) {
          const timeout = this.reconnectTimeouts.get(url);
          if (timeout) {
            clearTimeout(timeout);
          }

          const reconnectTimeout = setTimeout(() => {
            this.createConnection(url);
          }, 2000);

          this.reconnectTimeouts.set(url, reconnectTimeout);
        }
      };

      ws.onerror = (error) => {
        this.eventBus.publish(TOPICS.WS_ERROR, {
          message: "WebSocket connection error",
          error
        });
      };
    } catch (error) {
      this.eventBus.publish(TOPICS.WS_ERROR, {
        message: "Error creating WebSocket",
        error
      });
    }
  }
}

export default WebSocketService;