import type { EventPayload, Tenant } from "./types";

export type EventHandler = (payload: EventPayload) => Promise<void> | void;

export interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  pluginId?: string;
  once?: boolean;
}

export class EventBus {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private subscriptionCounter = 0;

  /**
   * Subscribe to an event
   */
  subscribe(
    eventType: string, 
    handler: EventHandler, 
    options: { pluginId?: string; once?: boolean } = {}
  ): string {
    const subscription: EventSubscription = {
      id: `sub_${++this.subscriptionCounter}`,
      eventType,
      handler,
      pluginId: options.pluginId,
      once: options.once
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    this.subscriptions.get(eventType)!.push(subscription);
    
    console.log(`Subscribed to event ${eventType} with ID ${subscription.id}`);
    return subscription.id;
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first emission)
   */
  once(eventType: string, handler: EventHandler, pluginId?: string): string {
    return this.subscribe(eventType, handler, { pluginId, once: true });
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        
        // Clean up empty event type arrays
        if (subscriptions.length === 0) {
          this.subscriptions.delete(eventType);
        }
        
        console.log(`Unsubscribed from event with ID ${subscriptionId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Unsubscribe all handlers for a plugin
   */
  unsubscribePlugin(pluginId: string): number {
    let unsubscribed = 0;
    
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      const initialLength = subscriptions.length;
      
      // Remove subscriptions for this plugin
      const filtered = subscriptions.filter(sub => sub.pluginId !== pluginId);
      this.subscriptions.set(eventType, filtered);
      
      unsubscribed += initialLength - filtered.length;
      
      // Clean up empty event type arrays
      if (filtered.length === 0) {
        this.subscriptions.delete(eventType);
      }
    }
    
    console.log(`Unsubscribed ${unsubscribed} handlers for plugin ${pluginId}`);
    return unsubscribed;
  }

  /**
   * Emit an event to all subscribers
   */
  async emit(eventType: string, data: any, tenant?: Tenant): Promise<void> {
    const subscriptions = this.subscriptions.get(eventType) || [];
    
    if (subscriptions.length === 0) {
      console.log(`No subscribers for event ${eventType}`);
      return;
    }

    const payload: EventPayload = {
      type: eventType,
      data,
      tenant,
      timestamp: new Date()
    };

    console.log(`Emitting event ${eventType} to ${subscriptions.length} subscribers`);

    // Execute handlers in parallel
    const promises = subscriptions.map(async (subscription) => {
      try {
        await subscription.handler(payload);
        
        // Remove one-time subscriptions
        if (subscription.once) {
          this.unsubscribe(subscription.id);
        }
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Emit an event synchronously (fire and forget)
   */
  emitSync(eventType: string, data: any, tenant?: Tenant): void {
    // Don't await the promise - fire and forget
    this.emit(eventType, data, tenant).catch(error => {
      console.error(`Error in async event emission for ${eventType}:`, error);
    });
  }

  /**
   * Get all event types with active subscriptions
   */
  getEventTypes(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Get subscription count for an event type
   */
  getSubscriptionCount(eventType: string): number {
    return this.subscriptions.get(eventType)?.length || 0;
  }

  /**
   * Get all subscriptions for debugging
   */
  getAllSubscriptions(): Map<string, EventSubscription[]> {
    return new Map(this.subscriptions);
  }

  /**
   * Clear all subscriptions (useful for testing)
   */
  clear(): void {
    this.subscriptions.clear();
    this.subscriptionCounter = 0;
    console.log("Event bus cleared");
  }
}

// Predefined event types for the platform
export const PLATFORM_EVENTS = {
  // Plugin lifecycle events
  PLUGIN_REGISTERED: "plugin.registered",
  PLUGIN_INITIALIZED: "plugin.initialized", 
  PLUGIN_DISABLED: "plugin.disabled",
  PLUGIN_ERROR: "plugin.error",

  // Tenant events
  TENANT_CREATED: "tenant.created",
  TENANT_UPDATED: "tenant.updated",
  TENANT_DELETED: "tenant.deleted",

  // User events
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_DELETED: "user.deleted",
  USER_LOGIN: "user.login",
  USER_LOGOUT: "user.logout",

  // Business events
  BUSINESS_UPDATED: "business.updated",
  
  // Generic data events
  DATA_CREATED: "data.created",
  DATA_UPDATED: "data.updated", 
  DATA_DELETED: "data.deleted"
} as const;