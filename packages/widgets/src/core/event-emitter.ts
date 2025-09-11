import { EventListener, WidgetEvent } from '../types';

export class EventEmitter {
  private listeners = new Map<string, Set<EventListener>>();
  private maxListeners = 50;

  on(eventType: string, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const eventListeners = this.listeners.get(eventType)!;
    
    if (eventListeners.size >= this.maxListeners) {
      console.warn(`Maximum listeners (${this.maxListeners}) exceeded for event: ${eventType}`);
    }

    eventListeners.add(listener);
  }

  off(eventType: string, listener: EventListener): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  once(eventType: string, listener: EventListener): void {
    const onceListener: EventListener = (event) => {
      this.off(eventType, onceListener);
      listener(event);
    };
    this.on(eventType, onceListener);
  }

  emit(eventType: string, data: any, widgetId: string): void {
    const event: WidgetEvent = {
      type: eventType,
      data,
      timestamp: Date.now(),
      widgetId
    };

    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }

    // Also emit to global listeners
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in global event listener:`, error);
        }
      });
    }
  }

  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(eventType: string): number {
    return this.listeners.get(eventType)?.size || 0;
  }

  eventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }
}