import { Module } from '@nestjs/common';
import { TranscriptionGateway } from './transcription.gateway';
import { TranscriptionService } from './transcription.service';
import { EventBus } from '../utils/event-bus';

@Module({
  providers: [
    TranscriptionGateway, 
    TranscriptionService,
    EventBus
  ],
  exports: [
    TranscriptionService
  ]
})
export class TranscriptionModule {}