# Real-time Audio Transcription System - Architectural Comparison

This repository contains implementations of two different architectural approaches for a real-time audio transcription system:

1. **Client-Server with Batch Processing** (client-server-transcribe-app)
2. **Pub-Sub with Pipe-and-Filter Processing** (pub-sub-transcribe-app)

Both implementations demonstrate key architectural patterns in the context of a web-based audio transcription application, providing a practical comparison of different design choices.

## Implementation Platform

### Node.js and TypeScript

Both implementations are built on:
- **Node.js**: v16.x or later (LTS version recommended)
- **TypeScript**: v4.x or later
- **Download**: [Node.js Official Website](https://nodejs.org/en/download/)

### Backend Frameworks

- **NestJS**: v10.x (for the Pub-Sub implementation)
- **Next.js API Routes**: v12.x (for the Client-Server implementation)

### Frontend Frameworks

- **React**: v18.x (for the Pub-Sub implementation)
- **Next.js**: v12.x (for the Client-Server implementation)

### System Requirements

- Modern web browser with WebSocket and Web Audio API support
- Microphone access for audio recording
- 4GB RAM minimum
- 2 CPU cores minimum

## Installation and Configuration

### Global Prerequisites

1. Install Node.js and npm:
   ```bash
   # Verify installation
   node --version  # Should be v16.x or higher
   npm --version   # Should be v8.x or higher
   ```

2. Install TypeScript globally (optional):
   ```bash
   npm install -g typescript
   ```

### Client-Server Architecture (client-server-transcribe-app)

1. Navigate to the project directory:
   ```bash
   cd client-server-transcribe-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Create a `.env` file with:
     ```
     # AWS Configuration
     AWS_REGION=us-east-1
     AWS_ACCESS_KEY_ID=your_access_key_id
     AWS_SECRET_ACCESS_KEY=your_secret_access_key
     AWS_S3_BUCKET=your_bucket_name
     
     # API Configuration
     NEXT_PUBLIC_API_URL=http://localhost:3000/api
     ```

### Pub-Sub Architecture (pub-sub-transcribe-app)

1. Backend setup:
   ```bash
   cd pub-sub-transcribe-app/backend
   npm install
   ```

2. Frontend setup:
   ```bash
   cd pub-sub-transcribe-app/frontend-react
   npm install
   ```

3. Configure environment variables for backend:
   - Create a `.env` file in the backend directory:
     ```
     PORT=3001
     AWS_REGION=us-east-1
     # Add AWS credentials if using actual AWS Transcribe
     # AWS_ACCESS_KEY_ID=your_access_key
     # AWS_SECRET_ACCESS_KEY=your_secret_key
     ```

4. Configure environment variables for frontend:
   - Create a `.env` file in the frontend directory:
     ```
     REACT_APP_BACKEND_URL=http://localhost:3001
     REACT_APP_WS_URL=ws://localhost:3001
     ```

## Compiling the Code

### Client-Server Architecture

```bash
cd client-server-transcribe-app

# Development build with hot-reload
npm run dev

# Production build
npm run build
```

### Pub-Sub Architecture

#### Backend

```bash
cd pub-sub-transcribe-app/backend

# Development build with watch mode
npm run dev
```

#### Frontend

```bash
cd pub-sub-transcribe-app/frontend-react

# Development build with hot-reload
npm start
```

## Executing the System

### Client-Server Architecture

```bash
cd client-server-transcribe-app

# Development mode
npm run dev
```

Access the application at `http://localhost:3000`

### Pub-Sub Architecture

1. Start the backend:
   ```bash
   cd pub-sub-transcribe-app/backend
   
   # Development mode
   npm run dev
   ```

2. In a separate terminal, start the frontend:
   ```bash
   cd pub-sub-transcribe-app/frontend-react
   
   # Development mode
   npm start
   ```

Access the application at `http://localhost:3000` (or the port indicated in the terminal)

## Architecture Comparison

### Client-Server with Batch Processing

#### Overview

The Client-Server architecture implements a traditional web application pattern where:
- The Next.js server handles API requests and serves web pages
- Audio is recorded on the client, then sent to the server as a complete file
- Processing happens in discrete batches (complete audio files)
- Results are returned directly to the client

#### Key Components

1. **Client (Browser)**
   - Records audio using the Web Audio API
   - Sends completed recordings to the server
   - Displays transcription results

2. **Server (Next.js)**
   - API routes for handling audio uploads
   - Batch processing of audio files
   - Integration with AWS S3 and Transcribe
   - Direct response to client requests

3. **AWS Services**
   - S3 for audio storage
   - Transcribe for batch audio-to-text conversion

#### Technical Implementation

- **React Components**: Client-side UI and audio recording
- **Next.js API Routes**: RESTful endpoints for audio processing
- **AWS SDK**: Interface to S3 and Transcribe services
- **HTTP/HTTPS**: Primary communication protocol

#### Data Flow

1. User initiates recording
2. Client captures and stores audio
3. When recording completes, client sends audio file to server
4. Server uploads file to S3
5. Server initiates transcription job
6. Server polls job status until complete
7. Server returns results to client
8. Client displays transcription

### Pub-Sub with Pipe-and-Filter Processing

#### Overview

The Pub-Sub architecture implements an event-driven system where:
- Components communicate through an event bus
- Audio streaming and processing happen in real-time
- Multiple processing stages form a processing pipeline
- Results flow back to clients as they become available

#### Key Components

1. **Event Bus**
   - Central message broker for all communication
   - Topic-based message routing
   - Support for hierarchical topics and wildcards

2. **WebSocket Gateway**
   - Handles client connections/disconnections
   - Translates between WebSocket messages and events
   - Manages client subscriptions

3. **Publisher Services**
   - Emit standardized events to the event bus
   - Format data for consumption by subscribers

4. **Processor Services**
   - Subscribe to specific event topics
   - Implement business logic for processing audio
   - Transform data through sequential filter stages
   - Publish results back to the event bus

5. **Client Application**
   - Records and streams audio in real-time
   - Communicates via WebSockets
   - Updates UI based on incremental transcription results

#### Technical Implementation

- **NestJS Framework**: Server-side infrastructure and dependency injection
- **EventEmitter2**: Event bus implementation
- **Socket.io**: WebSocket communication
- **React**: Client-side UI and WebSocket integration
- **TypeScript**: Type-safe communication between components

#### Data Flow

1. User initiates recording
2. Client streams audio chunks to server via WebSocket
3. Gateway publishes audio data events to the event bus
4. Processor services subscribe to audio events
5. Each processor stage filters and transforms the data
6. Transcription results are published back to the event bus
7. Gateway subscribes to result events and forwards to clients
8. Client updates UI with incremental results in real-time

### Architectural Comparison

#### Communication Pattern

- **Client-Server**: 
  - Request-response pattern
  - Synchronous, blocking operations
  - Direct method calls between components
  - Clear control flow

- **Pub-Sub**:
  - Event-based message passing
  - Asynchronous, non-blocking operations
  - Indirect communication through topics
  - Distributed control flow

#### Coupling and Dependencies

- **Client-Server**:
  - Tight coupling between components
  - Direct dependencies between modules
  - Changes in one component often affect others
  - Monolithic structure

- **Pub-Sub**:
  - Loose coupling between components
  - Components only depend on event formats
  - Components can be changed independently
  - Modular structure

#### Scalability

- **Client-Server**:
  - Vertical scaling primarily
  - Limited by server processing capacity
  - Single processing pipeline
  - Difficult to distribute

- **Pub-Sub**:
  - Both horizontal and vertical scaling
  - Components can scale independently
  - Multiple processing pipelines possible
  - Easily distributed across multiple nodes

#### Fault Tolerance

- **Client-Server**:
  - Single point of failure
  - Entire system affected by component failures
  - All-or-nothing processing
  - Difficult to implement partial functionality

- **Pub-Sub**:
  - Fault isolation between components
  - System can continue with partial functionality
  - Graceful degradation possible
  - Easy to implement redundancy

#### Real-time Capabilities

- **Client-Server**:
  - Batch processing oriented
  - Results available only after complete processing
  - Higher latency
  - Less responsive user experience

- **Pub-Sub**:
  - Stream processing oriented
  - Incremental results available immediately
  - Lower latency
  - More responsive user experience

#### Development Complexity

- **Client-Server**:
  - Simpler implementation
  - Familiar patterns for most developers
  - Easier to debug and trace execution
  - Lower initial development effort

- **Pub-Sub**:
  - More complex implementation
  - Event-driven paradigm can be challenging
  - Harder to debug and trace execution
  - Higher initial development effort

## Rationale for Final Architecture Selection

After implementing and evaluating both architectural approaches, we selected the **Pub-Sub with Pipe-and-Filter Processing** architecture as the superior solution for a real-time transcription system for the following reasons:

### 1. Real-time User Experience

The Pub-Sub architecture enables true real-time transcription with immediate feedback, which significantly improves the user experience. Users can see transcription results as they speak, rather than waiting for complete processing. This is crucial for applications like meeting transcription, dictation, or accessibility tools.

### 2. Scalability and Resource Efficiency

The decoupled nature of the Pub-Sub architecture allows for more efficient resource usage:
- Components can be scaled independently based on their specific load
- Processing can be distributed across multiple servers
- Streaming reduces memory requirements (no need to store entire audio files)
- Efficient handling of multiple concurrent users

### 3. Flexibility and Extensibility

The Pub-Sub architecture provides superior flexibility:
- New features can be added as new subscribers without modifying existing code
- Processing pipeline can be modified or extended easily
- Different transcription engines can be swapped without changing the client interface
- Additional processing steps (like translation, sentiment analysis, etc.) can be added modularly

### 4. Fault Isolation and Resilience

The event-driven approach provides better fault tolerance:
- Failures in one component don't necessarily affect others
- System can continue operating with degraded functionality
- Easier to implement retry mechanisms and fallbacks
- Better monitoring and observability of system state

### 5. Progressive Enhancement

The stream-based approach allows for progressive enhancement of transcription results:
- Initial quick results can be refined over time
- Confidence scores can be improved with additional context
- Partial results are still useful even if processing is interrupted

## Evolution from Original Project Proposal

Our original project proposal considered Client-Server and Model-View-Controller (MVC) as the candidate architectures. During implementation, we made the following key changes:

### 1. Replaced MVC with Pub-Sub/Pipe-and-Filter

**Original**: MVC was proposed as a candidate architecture pattern.
**Change**: Adopted Pub-Sub with Pipe-and-Filter instead.

**Rationale**:
- MVC is primarily a UI architecture pattern focused on separation of UI concerns
- As we explored the problem domain, we realized that data flow was the critical challenge
- The streaming nature of audio data aligned better with a pipeline approach
- Event-driven architecture provided better decoupling than MVC's controller-model interaction
- Pub-Sub pattern enabled true real-time updates without polling mechanisms

### 2. Added Batch Processing to Client-Server

**Original**: Basic Client-Server architecture without defined processing approach.
**Change**: Implemented batch processing for the Client-Server variant.

**Rationale**:
- Clearer contrast between the two architectural approaches
- Better alignment with AWS Transcribe's batch processing model
- More accurate representation of traditional web application patterns
- Provided a baseline for comparison with streaming approach

### 3. Integrated WebSockets Differently

**Original**: WebSockets were proposed as an add-on to both architectures.
**Change**: WebSockets became integral to the Pub-Sub architecture, optional for Client-Server.

**Rationale**:
- WebSockets aligned naturally with event-driven architecture
- Client-Server could function with traditional HTTP requests
- WebSockets enabled the real-time capabilities critical to Pub-Sub
- Created a clearer distinction between the two approaches

## Additional Design Considerations

### 1. Topic Naming Conventions

In the Pub-Sub architecture, we implemented a hierarchical topic naming convention:
```
<domain>.<entity>.<action>
client.<clientId>.<domain>.<action>
```

This provides several benefits:
- Natural organization of events
- Support for wildcard subscriptions
- Client-specific event isolation
- Clearer debugging and monitoring

### 2. Singleton Event Bus

The Event Bus is implemented as a singleton service to ensure:
- All components communicate through the same message broker
- Consistent event routing throughout the application
- Memory efficiency (single event infrastructure)
- Simplified reference and dependency injection

### 3. Stateless Processing

Both implementations favor stateless processing where possible:
- Client state is maintained on the client
- Server components maintain minimal session state
- AWS services handle persistent storage
- Improves scalability and fault tolerance

### 4. Mock Implementations

For development and demonstration purposes:
- AWS service interactions can be replaced with mock implementations
- Transcription can be simulated without actual AWS credentials
- System can run completely locally for development
- Enables testing without incurring cloud service costs

## Conclusion

The architectural comparison demonstrates how different design patterns impact a real-time audio transcription system. While the Client-Server architecture offers simplicity and familiarity, the Pub-Sub with Pipe-and-Filter architecture provides superior capabilities for real-time processing, scalability, and extensibility.

For applications where real-time feedback and processing flexibility are critical, the Pub-Sub architecture represents a more powerful solution despite its increased implementation complexity. The modular, event-driven approach allows for independent scaling, fault isolation, and easier feature extensions, making it the preferred architecture for modern real-time audio transcription systems.