import { Injectable, Logger } from '@nestjs/common';
import { WSRequest } from '../types/transcription.types';
import * as WebSocket from 'ws';
import { EventBus } from '../utils/event-bus';
import { TOPICS } from './topics';
import { formatWSErrResponse, formatWSResponse } from '../utils/io';
import { RESPONSE_TYPES } from '../types/transcription.types';
import {
  StartStreamTranscriptionCommand,
  TranscribeStreamingClient,
} from "@aws-sdk/client-transcribe-streaming";

function base64ToWebM(base64String: string) {
  const base64Data = base64String.replace("data:audio/pcm;base64,", "");
  const dataBuffer = Buffer.from(base64Data, "base64");
  return dataBuffer;
}

async function convertWebMToPCM(webmData: string) {
  try {
    const buf = base64ToWebM(webmData);
    return { AudioEvent: { AudioChunk: buf } };
  } catch (e) {
    console.error(e);
    return { AudioEvent: { AudioChunk: Buffer.from([]) } };
  }
}

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly transcribeClient: TranscribeStreamingClient;
  private readonly clients = new Map<string, WebSocket>();
  private readonly sessions = new Map<string, {
    messageQueue: any[];
    resolveNext: ((value: { value: any; done: boolean }) => void) | null;
    done: boolean;
  }>();
  
  constructor(private readonly eventBus: EventBus) {
    this.transcribeClient = new TranscribeStreamingClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    
    this.setupSubscriptions();
  }
  
  private setupSubscriptions() {
    // Subscribe to audio data events
    this.eventBus.subscribe(TOPICS.AUDIO_RECEIVED, async (data: { sessionId: string, audioData: string }) => {
      await this.processAudioData(data.sessionId, data.audioData);
    });
    
    // Subscribe to transcription results
    this.eventBus.subscribe(TOPICS.TRANSCRIPTION_RESULT, (data: { sessionId: string, transcript: string }) => {
      const client = this.clients.get(data.sessionId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(
          formatWSResponse<"REALTIME_TRANSCRIBE">({
            status: RESPONSE_TYPES.REALTIME_TRANSCRIBE,
            message: data.transcript,
          })
        );
      }
    });
    
    // Subscribe to partial transcription results
    this.eventBus.subscribe(TOPICS.TRANSCRIPTION_PARTIAL, (data: { sessionId: string, transcript: string }) => {
      const client = this.clients.get(data.sessionId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(
          formatWSResponse<"REALTIME_TRANSCRIBE_PARTIAL">({
            status: RESPONSE_TYPES.REALTIME_TRANSCRIBE_PARTIAL,
            message: data.transcript,
          })
        );
      }
    });
    
    // Subscribe to error events
    this.eventBus.subscribe(TOPICS.ERROR, (data: { sessionId: string, message: string }) => {
      const client = this.clients.get(data.sessionId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(formatWSErrResponse(data.message));
      }
    });
  }
  
  registerClient(ws: WebSocket, sessionId: string): void {
    this.logger.log(`Registering client with session ID: ${sessionId}`);
    this.clients.set(sessionId, ws);
    
    // Initialize a new session
    this.sessions.set(sessionId, {
      messageQueue: [],
      resolveNext: null,
      done: false
    });
    
    // Start a transcribe stream for this client
    this.startTranscribeStream(sessionId);
    
    // Handle client disconnect
    ws.on('close', () => {
      this.unregisterClient(sessionId);
    });
  }
  
  unregisterClient(sessionId: string): void {
    this.logger.log(`Unregistering client with session ID: ${sessionId}`);
    this.clients.delete(sessionId);
    
    // Mark the session as done
    const session = this.sessions.get(sessionId);
    if (session) {
      session.done = true;
      this.sessions.delete(sessionId);
    }
  }
  
  processRequest(ws: WebSocket, request: WSRequest): void {
    try {
      const sessionId = request.sessionId;
      
      // Add client to registry if not already present
      if (!this.clients.has(sessionId)) {
        this.registerClient(ws, sessionId);
      }
      
      if (request.type === 'REALTIME_TRANSCRIBE' && request.message) {
        // Publish audio data to the event bus
        this.eventBus.publish(TOPICS.AUDIO_RECEIVED, {
          sessionId,
          audioData: request.message
        });
      }
    } catch (error) {
      this.logger.error(`Error processing request: ${error.message}`, error.stack);
    }
  }
  
  private async processAudioData(sessionId: string, audioData: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    try {
      const audioStream = await convertWebMToPCM(audioData);
      
      if (session.resolveNext) {
        session.resolveNext({ value: audioStream, done: false });
        session.resolveNext = null;
      } else {
        session.messageQueue.push(audioStream);
      }
    } catch (error) {
      this.eventBus.publish(TOPICS.ERROR, {
        sessionId,
        message: "Error processing audio data"
      });
    }
  }
  
  private async startTranscribeStream(sessionId: string): Promise<void> {
    try {
      const audioStream = this.createAudioStreamGenerator(sessionId);
      
      const command = new StartStreamTranscriptionCommand({
        LanguageCode: "en-US",
        MediaSampleRateHertz: 48000,
        MediaEncoding: "pcm",
        AudioStream: audioStream,
      });
      
      const transcriptionStream = await this.transcribeClient.send(command);
      this.processTranscriptionStream(sessionId, transcriptionStream);
    } catch (error) {
      this.eventBus.publish(TOPICS.ERROR, {
        sessionId,
        message: "Failed to start transcription service"
      });
    }
  }
  
  private async *createAudioStreamGenerator(sessionId: string): AsyncGenerator<any, void, unknown> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    try {
      while (!session.done) {
        if (session.messageQueue.length > 0) {
          yield session.messageQueue.shift();
        } else {
          const value = await new Promise<{ value: any; done: boolean }>((resolve) => {
            session.resolveNext = resolve;
          });
          yield value.value;
        }
      }
    } catch (error) {
      this.logger.error(`Error in audio stream generator:`, error);
    }
  }
  
  private async processTranscriptionStream(sessionId: string, transcriptionStream: any): Promise<void> {
    try {
      for await (const event of transcriptionStream.TranscriptResultStream) {
        if (event.TranscriptEvent) {
          const results = event.TranscriptEvent.Transcript.Results;
          
          results.forEach((result: any) => {
            (result.Alternatives || []).forEach((alternative: any) => {
              try {
                if (!alternative.Items || alternative.Items.length === 0) {
                  return;
                }
                
                let transcript = alternative.Items.map(
                  (item: any) => item.Content
                ).join(" ");
                
                transcript = transcript.replace(
                  /( )([.,!?])/g,
                  (match: string, p1: string, p2: string) => p2
                );
                
                if (result.IsPartial) {
                  this.eventBus.publish(TOPICS.TRANSCRIPTION_PARTIAL, {
                    sessionId,
                    transcript
                  });
                } else {
                  this.eventBus.publish(TOPICS.TRANSCRIPTION_RESULT, {
                    sessionId,
                    transcript
                  });
                }
              } catch (error) {
                this.eventBus.publish(TOPICS.ERROR, {
                  sessionId,
                  message: "Error processing transcription"
                });
              }
            });
          });
        }
      }
    } catch (error) {
      this.eventBus.publish(TOPICS.ERROR, {
        sessionId,
        message: "Transcription service error"
      });
    }
  }
}