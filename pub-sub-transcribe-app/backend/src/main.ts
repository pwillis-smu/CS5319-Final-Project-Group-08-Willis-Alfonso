import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function bootstrap() {
  // Create a logger instance
  const logger = new Logger('Bootstrap');
  
  // Enable logging but only standard logs and errors
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'], // Only show standard logs and errors
    cors: {
      // Allow connections from both ports 3000 (CRA default) and 3002 (if specified)
      origin: ['http://localhost:3000', 'http://localhost:3002'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  
  // Use native WebSockets instead of Socket.IO
  app.useWebSocketAdapter(new WsAdapter(app));
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log(`WebSocket server is available at: ws://localhost:${port}`);
}
bootstrap();