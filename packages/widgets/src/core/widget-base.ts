import { WidgetConfig, WidgetError, WidgetTheme } from '../types';
import { ApiClient } from './api-client';
import { EventEmitter } from './event-emitter';
import { ThemeManager } from './theme-manager';

export abstract class BizBoxWidget extends EventEmitter {
  protected container: HTMLElement;
  protected config: WidgetConfig;
  protected apiClient: ApiClient;
  protected themeManager: ThemeManager;
  protected widgetId: string;
  protected isDestroyed = false;
  protected isLoading = false;

  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;

  constructor(containerId: string, config: WidgetConfig) {
    super();
    
    this.widgetId = this.generateWidgetId();
    this.config = this.validateConfig(config);
    
    // Find container element
    const container = document.getElementById(containerId);
    if (!container) {
      throw new WidgetError(
        `Container element not found: ${containerId}`,
        'CONTAINER_NOT_FOUND',
        this.widgetId
      );
    }
    
    this.container = container;
    this.setupContainer();
    
    // Initialize API client
    this.apiClient = new ApiClient({
      baseUrl: config.apiBaseUrl || 'https://api.bizbox.co.uk',
      apiKey: config.apiKey,
      tenantId: config.tenantId
    });
    
    // Initialize theme manager
    this.themeManager = new ThemeManager();
    
    // Setup error handling
    this.setupErrorHandling();
    
    // Setup lifecycle observers
    this.setupObservers();
  }

  abstract render(): Promise<void>;

  async initialize(): Promise<void> {
    try {
      this.setLoading(true);
      this.emit('widget:initializing', {}, this.widgetId);
      
      await this.loadStyles();
      await this.render();
      
      this.emit('widget:initialized', {}, this.widgetId);
      this.config.onLoad?.();
    } catch (error) {
      this.handleError(error);
    } finally {
      this.setLoading(false);
    }
  }

  destroy(): void {
    if (this.isDestroyed) return;
    
    try {
      this.emit('widget:destroying', {}, this.widgetId);
      
      // Cleanup observers
      this.resizeObserver?.disconnect();
      this.intersectionObserver?.disconnect();
      
      // Remove all event listeners
      this.removeAllListeners();
      
      // Clear container
      if (this.container) {
        this.container.innerHTML = '';
        this.container.classList.remove('bizbox-widget');
        this.container.removeAttribute('data-bizbox-initialized');
      }
      
      this.isDestroyed = true;
      this.emit('widget:destroyed', {}, this.widgetId);
    } catch (error) {
      console.error('Error during widget destruction:', error);
    }
  }

  protected setLoading(loading: boolean): void {
    this.isLoading = loading;
    
    if (loading) {
      this.container.classList.add('bizbox-loading');
      this.showLoadingState();
    } else {
      this.container.classList.remove('bizbox-loading');
      this.hideLoadingState();
    }
  }

  protected handleError(error: any): void {
    console.error(`Widget ${this.widgetId} error:`, error);
    
    const widgetError = error instanceof WidgetError 
      ? error 
      : new WidgetError(error.message || 'Unknown error', 'UNKNOWN_ERROR', this.widgetId);
    
    this.emit('widget:error', { error: widgetError }, this.widgetId);
    this.config.onError?.(widgetError);
    
    this.showError(widgetError.message);
  }

  protected showError(message: string): void {
    const errorElement = document.createElement('div');
    errorElement.className = 'bizbox-error';
    errorElement.innerHTML = `
      <div class="bizbox-error__icon">⚠️</div>
      <div class="bizbox-error__message">${this.escapeHtml(message)}</div>
      <button class="bizbox-error__retry" onclick="this.parentElement.parentElement.style.display='none'">
        Dismiss
      </button>
    `;
    
    this.container.innerHTML = '';
    this.container.appendChild(errorElement);
  }

  protected showLoadingState(): void {
    const loadingElement = document.createElement('div');
    loadingElement.className = 'bizbox-loading-spinner';
    loadingElement.innerHTML = `
      <div class="bizbox-spinner"></div>
      <div class="bizbox-loading-text">Loading...</div>
    `;
    
    // Only add if not already present
    if (!this.container.querySelector('.bizbox-loading-spinner')) {
      this.container.appendChild(loadingElement);
    }
  }

  protected hideLoadingState(): void {
    const loadingElement = this.container.querySelector('.bizbox-loading-spinner');
    if (loadingElement) {
      loadingElement.remove();
    }
  }

  protected async loadStyles(): Promise<void> {
    try {
      await this.themeManager.applyTheme(this.config.theme, this.container);
      this.handleResize();
    } catch (error) {
      console.warn('Failed to load styles:', error);
    }
  }

  protected handleResize(): void {
    // Override in subclasses for specific resize handling
    this.emit('widget:resize', { 
      width: this.container.offsetWidth, 
      height: this.container.offsetHeight 
    }, this.widgetId);
  }

  protected createElement(tag: string, className?: string, content?: string): HTMLElement {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (content) {
      element.textContent = content;
    }
    return element;
  }

  protected escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  protected formatCurrency(amount: number, currency = 'GBP'): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency
    }).format(amount);
  }

  protected formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  protected formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private generateWidgetId(): string {
    return `widget_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }

  private validateConfig(config: WidgetConfig): WidgetConfig {
    if (!config.tenantId) {
      throw new WidgetError('Tenant ID is required', 'INVALID_CONFIG');
    }
    
    return {
      apiBaseUrl: 'https://api.bizbox.co.uk',
      debug: false,
      ...config
    };
  }

  private setupContainer(): void {
    this.container.classList.add('bizbox-widget');
    this.container.setAttribute('data-bizbox-widget-id', this.widgetId);
    this.container.setAttribute('data-bizbox-initialized', 'true');
  }

  private setupErrorHandling(): void {
    // Handle uncaught errors within the widget
    window.addEventListener('error', (event) => {
      if (this.container.contains(event.target as Node)) {
        this.handleError(new Error(`Uncaught error: ${event.message}`));
      }
    });
  }

  private setupObservers(): void {
    // Setup resize observer
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        if (!this.isDestroyed) {
          this.handleResize();
        }
      });
      this.resizeObserver.observe(this.container);
    }

    // Setup intersection observer for lazy loading
    if (window.IntersectionObserver) {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.emit('widget:visible', {}, this.widgetId);
          } else {
            this.emit('widget:hidden', {}, this.widgetId);
          }
        });
      });
      this.intersectionObserver.observe(this.container);
    }
  }
}