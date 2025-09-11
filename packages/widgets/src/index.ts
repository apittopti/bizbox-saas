/**
 * BizBox Widgets Library
 * 
 * This file exports all public APIs for the BizBox widget system
 * for use in module environments (ES6, CommonJS, TypeScript)
 */

// Main API
export { default as BizBox, BizBoxAPI } from './embed';

// Widget classes for direct usage
export { BookingWidget } from './widgets/booking/booking-widget';
export { ProductCatalogWidget } from './widgets/products/product-catalog-widget';
export { ContactFormWidget } from './widgets/contact/contact-form-widget';

// Core classes for extending
export { BizBoxWidget } from './core/widget-base';
export { ApiClient } from './core/api-client';
export { EventEmitter } from './core/event-emitter';
export { ThemeManager } from './core/theme-manager';
export { BizBoxWidgetLoader } from './core/widget-loader';

// All type definitions
export * from './types';

// Analytics
export { analytics as WidgetAnalytics } from './embed';