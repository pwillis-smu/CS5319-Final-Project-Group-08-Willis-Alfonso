import { useRef, useCallback } from 'react';
import EventBus from 'utils/eventBus';

export function useEventBus() {
  const eventBus = useRef(EventBus.getInstance());
  
  const publish = useCallback((topic: string, data: any) => {
    eventBus.current.publish(topic, data);
  }, []);
  
  const subscribe = useCallback((topic: string, callback: (data: any) => void) => {
    const unsubscribe = eventBus.current.subscribe(topic, callback);
    return unsubscribe;
  }, []);
  
  return { publish, subscribe };
}