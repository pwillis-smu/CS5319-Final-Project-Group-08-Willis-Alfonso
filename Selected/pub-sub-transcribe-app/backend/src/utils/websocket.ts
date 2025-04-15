import { WSRequest } from '../types/transcription.types';
import { ZodObject } from 'zod';
import * as WebSocket from 'ws';

export abstract class WSHandler {
  protected requestType!: ZodObject<any>;
  protected responseType!: ZodObject<any>;

  constructor(requestSchema: ZodObject<any>, responseShema: ZodObject<any>) {
    this.requestType = requestSchema;
    this.responseType = responseShema;
  }

  abstract processRequest(ws: WebSocket, request: WSRequest);

  getRequestType() {
    return this.requestType;
  }

  getResponseType() {
    return this.responseType;
  }
}

export abstract class WSPacketHandler extends WSHandler {
  abstract wsHandler(ws: WebSocket, request: WSRequest): void;
  processRequest(ws: WebSocket, request: WSRequest): void {
    {
     //this.requestType.parse(request);
      this.wsHandler(ws, request);
    }
  }
}