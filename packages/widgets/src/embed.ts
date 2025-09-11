/**
 * BizBox Widgets - Embeddable Components for External Websites
 * 
 * This is the main entry point for the BizBox widget system.
 * It provides a simple API for embedding BizBox functionality on any website.
 */

import { widgetLoader } from './core/widget-loader';
import { BookingWidget } from './widgets/booking/booking-widget';
import { ProductCatalogWidget } from './widgets/products/product-catalog-widget';
import { ContactFormWidget } from './widgets/contact/contact-form-widget';
import { 
  GlobalConfig, 
  WidgetConfig, 
  BookingWidgetConfig, 
  ProductCatalogWidgetConfig, 
  ContactFormWidgetConfig 
} from './types';

// Import styles
import './styles/base.css';

/**
 * Main BizBox namespace that will be available globally
 */
export class BizBoxAPI {
  private loader = widgetLoader;

  /**
   * Initialize BizBox with global configuration
   * @param config Global configuration for all widgets
   */
  init(config: GlobalConfig): void {
    this.loader.init(config);
  }

  /**
   * Create a booking widget
   * @param containerId ID of the container element
   * @param config Widget-specific configuration
   * @returns BookingWidget instance
   */
  createBookingWidget(containerId: string, config: BookingWidgetConfig): BookingWidget {
    return this.loader.createWidget(containerId, 'booking', config) as BookingWidget;
  }

  /**
   * Create a product catalog widget
   * @param containerId ID of the container element
   * @param config Widget-specific configuration
   * @returns ProductCatalogWidget instance
   */
  createProductCatalogWidget(containerId: string, config: ProductCatalogWidgetConfig): ProductCatalogWidget {
    return this.loader.createWidget(containerId, 'products', config) as ProductCatalogWidget;
  }

  /**
   * Create a contact form widget
   * @param containerId ID of the container element
   * @param config Widget-specific configuration
   * @returns ContactFormWidget instance
   */
  createContactFormWidget(containerId: string, config: ContactFormWidgetConfig): ContactFormWidget {
    return this.loader.createWidget(containerId, 'contact', config) as ContactFormWidget;
  }

  /**
   * Create a widget of any supported type
   * @param containerId ID of the container element
   * @param type Widget type ('booking', 'products', 'contact')
   * @param config Widget configuration
   * @returns Widget instance
   */
  createWidget(containerId: string, type: string, config: WidgetConfig) {
    return this.loader.createWidget(containerId, type, config);
  }

  /**
   * Destroy a widget by container ID
   * @param containerId ID of the container element
   * @returns true if widget was destroyed, false if not found
   */
  destroyWidget(containerId: string): boolean {
    return this.loader.destroyWidget(containerId);
  }

  /**
   * Get a widget instance by container ID
   * @param containerId ID of the container element
   * @returns Widget instance or undefined
   */
  getWidget(containerId: string) {
    return this.loader.getWidget(containerId);
  }

  /**
   * Destroy all widgets
   */
  destroyAll(): void {
    this.loader.destroyAllWidgets();
  }

  /**
   * Refresh all widgets (useful after theme changes)
   */
  refreshAll(): void {
    this.loader.refreshAllWidgets();
  }

  /**
   * Register a custom widget type
   * @param type Widget type identifier
   * @param widgetClass Widget class constructor
   */
  registerCustomWidget(type: string, widgetClass: any): void {
    this.loader.registerWidget(type, widgetClass);
  }

  /**
   * Get available widget types
   * @returns Array of available widget type identifiers
   */
  getAvailableTypes(): string[] {
    return this.loader.getAvailableWidgetTypes();
  }

  /**
   * Get loader statistics
   * @returns Object containing widget statistics
   */
  getStats() {
    return this.loader.getStats();
  }

  /**
   * Update global configuration
   * @param config Partial global configuration
   */
  updateConfig(config: Partial<GlobalConfig>): void {
    this.loader.updateGlobalConfig(config);
  }

  /**
   * Enable or disable debug mode
   * @param enabled Whether debug mode should be enabled
   */
  setDebugMode(enabled: boolean): void {
    this.loader.setDebugMode(enabled);
  }

  /**
   * Add global event listener for all widget events
   * @param eventType Event type to listen for (* for all events)
   * @param callback Event callback function
   */
  on(eventType: string, callback: Function): void {
    this.loader.on(eventType, callback);
  }

  /**
   * Remove global event listener
   * @param eventType Event type
   * @param callback Event callback function
   */
  off(eventType: string, callback: Function): void {
    this.loader.off(eventType, callback);
  }

  // Direct widget class exports for advanced usage
  BookingWidget = BookingWidget;
  ProductCatalogWidget = ProductCatalogWidget;
  ContactFormWidget = ContactFormWidget;

  /**
   * Get version information
   */
  get version(): string {
    return '1.0.0';
  }

  /**
   * Check if BizBox is initialized
   */
  get isInitialized(): boolean {
    return this.loader.getStats().initialized;
  }
}

// Create the global API instance
const BizBox = new BizBoxAPI();

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).BizBox = BizBox;
  
  // Auto-initialize if global config is present
  const globalConfig = (window as any).BizBoxConfig;
  if (globalConfig && !BizBox.isInitialized) {
    BizBox.init(globalConfig);
  }
}

// Export for module systems
export default BizBox;
export { BizBoxAPI };

// Export widget classes for direct usage
export { BookingWidget, ProductCatalogWidget, ContactFormWidget };

// Export types for TypeScript users
export * from './types';

// Analytics integration
class WidgetAnalytics {
  private tenantId: string = '';
  private enabled: boolean = false;
  private endpoint: string = 'https://analytics.bizbox.co.uk/widgets';

  init(tenantId: string, enabled: boolean = true): void {
    this.tenantId = tenantId;
    this.enabled = enabled;
    
    if (this.enabled) {
      // Track widget library load
      this.track('library:loaded', {
        version: BizBox.version,
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer
      });
    }
  }

  track(event: string, data: any = {}): void {
    if (!this.enabled || !this.tenantId) return;
    
    const payload = {
      event,
      data,
      tenantId: this.tenantId,
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    // Use sendBeacon for reliability, fallback to fetch
    if (navigator.sendBeacon) {
      navigator.sendBeacon(this.endpoint, JSON.stringify(payload));
    } else {
      fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {
        // Ignore analytics errors
      });
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('bizbox-session-id');
    if (!sessionId) {
      sessionId = 'session_' + Math.random().toString(36).substr(2, 16);
      sessionStorage.setItem('bizbox-session-id', sessionId);
    }
    return sessionId;
  }
}

// Initialize analytics
const analytics = new WidgetAnalytics();

// Setup analytics event forwarding
BizBox.on('*', (data: any) => {
  analytics.track(data.type || 'widget:event', data.data || data);
});

// Initialize analytics when BizBox is initialized
BizBox.on('loader:initialized', (data: any) => {
  const config = data.config;
  analytics.init(config.tenantId, !config.debug);
});

// Export analytics for manual usage
export { analytics as WidgetAnalytics };

// Console welcome message
if (typeof console !== 'undefined' && console.log) {
  console.log(`
🚀 BizBox Widgets v${BizBox.version} loaded successfully!

Quick start:
1. Initialize: BizBox.init({ tenantId: 'your-tenant-id' });
2. Create widget: BizBox.createBookingWidget('container-id', { /* config */ });

Documentation: https://docs.bizbox.co.uk/widgets
Support: https://support.bizbox.co.uk
  `);
}