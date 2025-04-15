import {
  StartStreamTranscriptionCommand,
  TranscribeStreamingClient,
} from "@aws-sdk/client-transcribe-streaming";
import {
  REQUEST_TYPES,
  RESPONSE_TYPES,
  WSRealtimeTranscribeRequest,
} from "../../types/transcription.types";
import { formatWSErrResponse, formatWSResponse } from "../../utils/io";
import * as WebSocket from "ws";
import { WSPacketHandler } from "../../utils/websocket";
import { Logger } from "@nestjs/common";

function base64ToWebM(base64String: string) {
  // Remove Base64 prefix (if present) and decode the string
  const base64Data = base64String.replace("data:audio/pcm;base64,", "");
  const dataBuffer = Buffer.from(base64Data, "base64");
  return dataBuffer;
}

// Function to convert WebM audio data to PCM format
export async function convertWebMToPCM(webmData: string) {
  try {
    const buf = base64ToWebM(webmData);
    return { AudioEvent: { AudioChunk: buf } };
  } catch (e) {
    console.error(e);
    return { AudioEvent: { AudioChunk: Buffer.from([]) } };
  }
}

// Access AWS credentials from environment variables
const client = new TranscribeStreamingClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
});

export class RealtimeTranscribeHandler extends WSPacketHandler {
  private readonly logger = new Logger(RealtimeTranscribeHandler.name);
  private transcribeRunning = false;

  private connectionHandler(ws: WebSocket) {
    const messageQueue = [];
    let resolveNext;
    let done = false;
    ws.on("message", async function incoming(req_raw: string) {
      const req: WSRealtimeTranscribeRequest = JSON.parse(req_raw);
      if (req.type === REQUEST_TYPES.REALTIME_TRANSCRIBE) {
        const audioStream = await convertWebMToPCM(req.message);

        if (resolveNext) {
          resolveNext({ value: audioStream, done: false });
          resolveNext = null;
        } else {
          messageQueue.push(audioStream);
        }
      }
    });

    ws.on("close", () => {
      console.log("closed");
      this.transcribeRunning = false;
      done = true;
    });

    ws.on("error", () => {
      this.transcribeRunning = false;
      done = true;
    });

    async function* messages() {
      try {
        while (!done) {
          if (messageQueue.length > 0) {
            yield messageQueue.shift();
          } else {
            // Wait for the next message or close/error event
            const val = await new Promise((resolve) => {
              resolveNext = resolve;
            });
            // @ts-expect-error expected
            yield val.value;
          }
        }
      } catch (err) {
        console.error("in message:", err);
      } finally {
        ws.terminate();
      }
    }

    return messages();
  }

  async wsHandler(ws: WebSocket, req: WSRealtimeTranscribeRequest) {
    if (!this.transcribeRunning) {
      console.log("Started Transcription Job");
      this.transcribeRunning = true;
      let command;
      try {
        command = new StartStreamTranscriptionCommand({
          LanguageCode: "en-US",
          MediaSampleRateHertz: 48000, // Adjust sample rate as needed
          MediaEncoding: "pcm",
          AudioStream: this.connectionHandler(ws),
        });
      } catch {
        console.log("refresh on start");
      }

      void (async () => {
        try {
          const transcriptionStream = await client.send(command);
          if (transcriptionStream) {
            // @ts-expect-error expected
            for await (const event of transcriptionStream.TranscriptResultStream) {
              try {
                if (event.TranscriptEvent) {
                  // Get multiple possible results
                  const results = event.TranscriptEvent.Transcript.Results;
                  // Print all the possible transcripts
                  results.forEach((result) => {
                    (result.Alternatives || []).forEach((alternative) => {
                      try {
                        let transcript = alternative.Items.map(
                          (item) => item.Content
                        ).join(" ");
                        transcript = transcript.replace(
                          /( )([.,!?])/g,
                          (match, p1, p2) => p2
                        );
                        if (result.IsPartial) {
                          this.logger.log("PARTIAL", transcript);
                          ws.send(
                            formatWSResponse<"REALTIME_TRANSCRIBE_PARTIAL">({
                              status:
                                RESPONSE_TYPES.REALTIME_TRANSCRIBE_PARTIAL,
                              message: transcript,
                            })
                          );
                        } else {
                          this.logger.log("COMPLETE", transcript);
                          ws.send(
                            formatWSResponse<"REALTIME_TRANSCRIBE">({
                              status: RESPONSE_TYPES.REALTIME_TRANSCRIBE,
                              message: transcript,
                            })
                          );
                        }
                      } catch (err) {
                        this.logger.error(err);
                        this.transcribeRunning = false;
                        ws.send(
                          formatWSErrResponse("Realtime transcribe error")
                        );
                        return;
                      }
                    });
                  });
                }
              } catch {
                console.log("Refreshed");
                this.transcribeRunning = false;
                ws.send(formatWSErrResponse("Realtime transcribe error"));
                return;
              }
            }
          }
        } catch {
          this.transcribeRunning = false;
          return;
        }
        //  this.transcribeRunning = false;
      })().catch((err) => {
        console.error("async error ", err);
        this.transcribeRunning = false;
        ws.send(formatWSErrResponse("Realtime transcribe error"));
        return;
      });
    }
  }
}
