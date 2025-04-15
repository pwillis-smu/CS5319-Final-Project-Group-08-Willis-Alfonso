import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from "@nestjs/websockets";
import { RESPONSE_TYPES } from "../types/transcription.types";
import { Server } from "ws";
import * as WebSocket from "ws";
import { formatWSResponse } from "../utils/io";
import { WSRequest } from "../types/transcription.types";
import { TranscriptionService } from "./transcription.service";
import { Logger } from '@nestjs/common';
import { uuidv4 } from '../utils/uuid';

@WebSocketGateway()
export class TranscriptionGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private readonly logger = new Logger(TranscriptionGateway.name);
  
  constructor(private readonly transcriptionService: TranscriptionService) {}
  
  @WebSocketServer()
  server: Server;
  
  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: WebSocket) {
    const sessionId = uuidv4();
    (client as any).sessionId = sessionId;
    
    client.send(
      formatWSResponse<"CONNECTED">({
        status: RESPONSE_TYPES.CONNECTED,
        message: "Connected to server",
        sessionId,
      })
    );
    
    this.transcriptionService.registerClient(client, sessionId);

    client.on("message", (rawMessage: WebSocket.Data) => {
      try {
        const message: WSRequest = JSON.parse(rawMessage.toString());
        // Add sessionId if not present
        if (!message.sessionId) {
          message.sessionId = sessionId;
        }
        this.transcriptionService.processRequest(client, message);
      } catch (error) {
        this.logger.error("Failed to parse message:", error);
      }
    });
  }

  handleDisconnect(client: WebSocket) {
    const sessionId = (client as any).sessionId;
    if (sessionId) {
      this.transcriptionService.unregisterClient(sessionId);
    }
    this.logger.log('Client disconnected');
  }
}