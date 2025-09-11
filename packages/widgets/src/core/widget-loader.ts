import { BizBoxWidget } from './widget-base';
import { BookingWidget } from '../widgets/booking/booking-widget';
import { ProductCatalogWidget } from '../widgets/products/product-catalog-widget';
import { ContactFormWidget } from '../widgets/contact/contact-form-widget';
import { GlobalConfig, WidgetConfig, WidgetError } from '../types';

export class BizBoxWidgetLoader {
  private widgets = new Map<string, BizBoxWidget>();
  private globalConfig: GlobalConfig = {
    tenantId: '',
    apiBaseUrl: 'https://api.bizbox.co.uk',
    autoInit: true,
    debug: false
  };
  private initialized = false;

  // Widget registry for dynamic loading
  private widgetRegistry = new Map<string, typeof BizBoxWidget>([
    ['booking', BookingWidget],
    ['products', ProductCatalogWidget],
    ['contact', ContactFormWidget]
  ]);

  /**
   * Initialize the widget loader with global configuration
   */
  init(config: GlobalConfig): void {
    this.globalConfig = { ...this.globalConfig, ...config };
    
    if (this.globalConfig.debug) {
      console.log('BizBox Widgets initialized with config:', this.globalConfig);
    }
    
    // Auto-discover and initialize widgets if enabled
    if (this.globalConfig.autoInit !== false) {
      this.discoverAndInitializeWidgets();
    }
    
    this.initialized = true;
    this.emit('loader:initialized', { config: this.globalConfig });
  }

  /**
   * Automatically discover widgets from DOM and initialize them
   */
  discoverAndInitializeWidgets(): void {
    const elements = document.querySelectorAll('[data-bizbox-widget]');
    
    if (this.globalConfig.debug) {
      console.log(`Found ${elements.length} widget elements`);
    }
    
    elements.forEach(element => {
      try {
        this.createWidgetFromElement(element as HTMLElement);
      } catch (error) {
        console.error('Failed to create widget from element:', element, error);
      }
    });
  }

  /**
   * Create a widget from a DOM element
   */
  createWidgetFromElement(element: HTMLElement): BizBoxWidget {
    const type = element.dataset.bizboxWidget;
    const configData = element.dataset.bizboxConfig;
    
    if (!type) {
      throw new WidgetError('Widget type not specified', 'MISSING_WIDGET_TYPE');
    }
    
    if (!element.id) {
      // Generate an ID if none exists
      element.id = `bizbox-widget-${type}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Parse configuration
    let config: WidgetConfig;
    try {
      const parsedConfig = configData ? JSON.parse(configData) : {};
      config = this.mergeWithGlobalConfig(parsedConfig);
    } catch (error) {
      throw new WidgetError(
        `Invalid widget configuration JSON: ${error.message}`,
        'INVALID_CONFIG_JSON'
      );
    }
    
    return this.createWidget(element.id, type, config);
  }

  /**
   * Create a widget programmatically
   */
  createWidget(containerId: string, type: string, config: WidgetConfig): BizBoxWidget {
    // Check if widget already exists
    if (this.widgets.has(containerId)) {
      throw new WidgetError(
        `Widget already exists for container: ${containerId}`,
        'WIDGET_EXISTS'
      );
    }
    
    // Get widget class
    const WidgetClass = this.getWidgetClass(type);
    if (!WidgetClass) {
      throw new WidgetError(`Unknown widget type: ${type}`, 'UNKNOWN_WIDGET_TYPE');
    }
    
    // Merge with global configuration
    const finalConfig = this.mergeWithGlobalConfig(config);
    
    try {
      // Create widget instance
      const widget = new WidgetClass(containerId, finalConfig);
      
      // Store widget reference
      this.widgets.set(containerId, widget);
      
      // Initialize widget
      widget.initialize().catch(error => {
        console.error(`Failed to initialize widget ${containerId}:`, error);
        this.destroyWidget(containerId);
      });
      
      // Setup widget event forwarding
      this.setupWidgetEventForwarding(widget);
      
      if (this.globalConfig.debug) {
        console.log(`Created ${type} widget for container: ${containerId}`);
      }
      
      this.emit('widget:created', { containerId, type, widget });
      
      return widget;
    } catch (error) {
      throw new WidgetError(
        `Failed to create ${type} widget: ${error.message}`,
        'WIDGET_CREATION_FAILED'
      );
    }
  }

  /**
   * Destroy a widget
   */
  destroyWidget(containerId: string): boolean {
    const widget = this.widgets.get(containerId);
    if (!widget) {
      return false;
    }
    
    try {
      widget.destroy();
      this.widgets.delete(containerId);
      
      if (this.globalConfig.debug) {
        console.log(`Destroyed widget for container: ${containerId}`);
      }
      
      this.emit('widget:destroyed', { containerId });
      return true;
    } catch (error) {
      console.error(`Failed to destroy widget ${containerId}:`, error);
      return false;
    }
  }

  /**
   * Destroy all widgets
   */
  destroyAllWidgets(): void {
    const containerIds = Array.from(this.widgets.keys());
    containerIds.forEach(containerId => {
      this.destroyWidget(containerId);
    });
  }

  /**
   * Get a widget instance by container ID
   */
  getWidget(containerId: string): BizBoxWidget | undefined {
    return this.widgets.get(containerId);
  }

  /**
   * Get all widget instances
   */
  getAllWidgets(): Map<string, BizBoxWidget> {
    return new Map(this.widgets);
  }

  /**
   * Register a custom widget type
   */
  registerWidget(type: string, widgetClass: typeof BizBoxWidget): void {
    this.widgetRegistry.set(type, widgetClass);
    
    if (this.globalConfig.debug) {
      console.log(`Registered custom widget type: ${type}`);
    }
  }

  /**
   * Unregister a widget type
   */
  unregisterWidget(type: string): boolean {
    return this.widgetRegistry.delete(type);
  }

  /**
   * Get available widget types
   */
  getAvailableWidgetTypes(): string[] {
    return Array.from(this.widgetRegistry.keys());
  }

  /**
   * Update global configuration
   */
  updateGlobalConfig(config: Partial<GlobalConfig>): void {
    this.globalConfig = { ...this.globalConfig, ...config };
    
    if (this.globalConfig.debug) {
      console.log('Global configuration updated:', this.globalConfig);
    }
    
    this.emit('config:updated', { config: this.globalConfig });
  }

  /**
   * Refresh all widgets (useful for theme changes)
   */
  refreshAllWidgets(): void {
    this.widgets.forEach((widget, containerId) => {
      try {
        widget.render();
      } catch (error) {
        console.error(`Failed to refresh widget ${containerId}:`, error);
      }
    });
  }

  /**
   * Get loader statistics
   */
  getStats(): {
    totalWidgets: number;
    widgetsByType: Record<string, number>;
    initialized: boolean;
  } {
    const widgetsByType: Record<string, number> = {};
    
    this.widgets.forEach(widget => {
      const type = widget.constructor.name.replace('Widget', '').toLowerCase();
      widgetsByType[type] = (widgetsByType[type] || 0) + 1;
    });
    
    return {
      totalWidgets: this.widgets.size,
      widgetsByType,
      initialized: this.initialized
    };
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.globalConfig.debug = enabled;
  }

  private getWidgetClass(type: string): typeof BizBoxWidget | undefined {
    return this.widgetRegistry.get(type);
  }

  private mergeWithGlobalConfig(config: Partial<WidgetConfig>): WidgetConfig {
    return {
      tenantId: this.globalConfig.tenantId,
      apiBaseUrl: this.globalConfig.apiBaseUrl,
      theme: this.globalConfig.theme,
      debug: this.globalConfig.debug,
      ...config
    };
  }

  private setupWidgetEventForwarding(widget: BizBoxWidget): void {
    // Forward widget events to global listeners
    widget.on('*', (event) => {
      this.emit(event.type, event.data);
    });
  }

  // Simple event emitter for loader events
  private eventListeners = new Map<string, Set<Function>>();

  private emit(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in loader event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Add event listener for loader events
   */
  on(eventType: string, listener: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(eventType: string, listener: Function): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType);
      }
    }
  }
}

// Create global instance
export const widgetLoader = new BizBoxWidgetLoader();

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Check if global BizBox config exists
      const globalConfig = (window as any).BizBoxConfig;
      if (globalConfig) {
        widgetLoader.init(globalConfig);
      }
    });
  } else {
    // DOM already loaded
    const globalConfig = (window as any).BizBoxConfig;
    if (globalConfig) {
      widgetLoader.init(globalConfig);
    }
  }
}