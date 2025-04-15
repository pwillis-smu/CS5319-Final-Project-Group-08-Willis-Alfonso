type EventCallback = (data: any) => void;

class EventBus {
  private static instance: EventBus | null = null;
  private events: Map<string, Set<EventCallback>>;

  private constructor() {
    this.events = new Map();
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public publish(topic: string, data: any): void {
    const callbacks = this.events.get(topic);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error executing callback for topic ${topic}:`, error);
        }
      });
    }
  }

  public subscribe(topic: string, callback: EventCallback): () => void {
    if (!this.events.has(topic)) {
      this.events.set(topic, new Set());
    }
    
    const callbacks = this.events.get(topic)!;
    callbacks.add(callback);
    
    return () => {
      const callbackSet = this.events.get(topic);
      if (callbackSet) {
        callbackSet.delete(callback);
        if (callbackSet.size === 0) {
          this.events.delete(topic);
        }
      }
    };
  }
}

export default EventBus;