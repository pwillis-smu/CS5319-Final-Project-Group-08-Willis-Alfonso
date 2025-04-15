# Real-time Transcription Backend

This is a NestJS backend for real-time audio transcription using WebSockets and AWS Transcribe Streaming. It follows the architecture pattern from the sample-transcribe-backend example.

## Features

- Real-time transcription using AWS Transcribe Streaming
- WebSocket-based communication for low-latency streaming
- Support for both partial and complete transcription results
- Structured logging for easy debugging

## Technical Implementation

The backend is built with:
- NestJS framework for the application structure
- Native WebSockets (`ws`) for real-time communication
- AWS Transcribe Streaming for speech-to-text conversion
- TypeScript for type safety
- Zod for runtime validation

## Architecture

The backend follows a modular architecture:

1. **WebSocket Gateway**: Handles client connections and message routing
2. **WebSocket Service**: Processes incoming requests and routes them to appropriate handlers
3. **Transcription Handler**: Manages the AWS Transcribe streaming connection
4. **AWS Transcribe Integration**: Handles real-time speech-to-text conversion

## WebSocket API

### Client to Server Messages

- `REALTIME_TRANSCRIBE`: Sends audio data for processing
  ```json
  {
    "type": "REALTIME_TRANSCRIBE",
    "sessionId": "unique-session-id",
    "message": "base64-audio-data"
  }
  ```

### Server to Client Messages

- `CONNECTED`: Confirms successful connection
  ```json
  {
    "status": "CONNECTED",
    "message": "Connected to server"
  }
  ```

- `REALTIME_TRANSCRIBE_PARTIAL`: Returns partial transcription results
  ```json
  {
    "status": "REALTIME_TRANSCRIBE_PARTIAL",
    "message": "Partial transcription text"
  }
  ```

- `REALTIME_TRANSCRIBE`: Returns complete transcription segments
  ```json
  {
    "status": "REALTIME_TRANSCRIBE",
    "message": "Complete transcription segment"
  }
  ```

- `ERROR`: Indicates an error occurred
  ```json
  {
    "status": "ERROR",
    "message": "Error message"
  }
  ```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   Create a `.env` file with:
   ```
   # AWS Configuration
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key-id
   AWS_SECRET_ACCESS_KEY=your-secret-access-key
   
   # Server Configuration
   PORT=3001
   
   # Logging
   LOG_LEVEL=debug
   ```

3. Run the development server:
   ```bash
   npm run start:dev
   ```

4. The WebSocket server will be available at `ws://localhost:3001`

## Implementation Details

### Message Flow

1. Client connects to WebSocket server
2. Server sends CONNECTED response
3. Client starts recording audio and sends chunks via REALTIME_TRANSCRIBE messages
4. Backend converts base64 audio to binary and streams to AWS Transcribe
5. Server forwards partial and complete transcription results to client
6. When client stops sending audio, the transcription completes

### Audio Streaming Architecture

The backend uses an innovative approach to handle streaming:

1. Incoming audio chunks are added to a message queue
2. An async generator yields audio chunks from the queue to AWS
3. When the queue is empty, it awaits new audio chunks
4. This creates a seamless streaming experience while handling WebSocket's message-based nature

### Error Handling

The application includes comprehensive error handling:
- Detailed logging at multiple levels (error, warn, log, debug, verbose)
- Graceful recovery from AWS service interruptions
- Client notifications for any errors
- Connection monitoring and cleanup

## Frontend Integration

The backend is designed to work with the included React frontend application. The frontend:
1. Records audio using the browser's MediaRecorder API
2. Streams audio data to the backend via WebSockets
3. Displays real-time transcription results as they arrive
4. Shows final transcription when recording stops