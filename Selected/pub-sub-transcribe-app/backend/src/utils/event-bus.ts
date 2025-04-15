import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';

// Using a singleton pattern to ensure we have only one instance of EventBus
let eventBusInstance: EventBus | null = null;

@Injectable()
export class EventBus {
  private readonly logger = new Logger(EventBus.name);
  private readonly emitter: EventEmitter2;

  constructor() {
    if (eventBusInstance) {
      // Return the existing instance
      this.logger.log('Reusing existing EventBus instance');
      return eventBusInstance;
    }

    // Create a new instance
    this.emitter = new EventEmitter2({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    });
    this.logger.log('Created new EventBus instance');
    eventBusInstance = this;
  }

  publish(topic: string, data: any): void {
    this.logger.log(`Publishing to ${topic}`);
    this.emitter.emit(topic, data);
  }

  subscribe(topic: string, callback: (data: any) => void): () => void {
    this.logger.log(`Subscribing to ${topic}`);
    this.emitter.on(topic, callback);
    
    return () => {
      this.emitter.off(topic, callback);
    };
  }
}