// Core widget configuration interface
export interface WidgetConfig {
  tenantId: string;
  apiKey?: string;
  apiBaseUrl?: string;
  theme?: WidgetTheme | string;
  debug?: boolean;
  onError?: (error: Error) => void;
  onLoad?: () => void;
}

// Widget theme configuration
export interface WidgetTheme {
  name?: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  borderRadius: number;
  fontFamily: string;
  fontSize: string;
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
}

// Global configuration for all widgets
export interface GlobalConfig {
  tenantId: string;
  apiKey?: string;
  apiBaseUrl?: string;
  theme?: WidgetTheme | string;
  debug?: boolean;
  autoInit?: boolean;
}

// API client configuration
export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  tenantId: string;
  timeout?: number;
}

// Cache entry structure
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Event system types
export interface WidgetEvent {
  type: string;
  data: any;
  timestamp: number;
  widgetId: string;
}

export type EventListener = (event: WidgetEvent) => void;

// Common data types
export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  currency: string;
  categoryId?: string;
  staffIds?: string[];
  imageUrl?: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  imageUrl?: string;
  serviceIds: string[];
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  staffId?: string;
  available: boolean;
  price?: number;
}

export interface BookingData {
  serviceId: string;
  staffId?: string;
  startTime: Date;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
}

export interface BookingResult {
  id: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  confirmationCode: string;
  booking: BookingData & {
    endTime: Date;
    totalPrice: number;
  };
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  categoryId?: string;
  imageUrl?: string;
  images?: string[];
  inStock: boolean;
  stockQuantity?: number;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
  attributes: Record<string, string>;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
}

export interface ShoppingCart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  currency: string;
}

export interface ContactData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  category?: string;
}

export interface ContactResult {
  id: string;
  status: 'sent' | 'pending' | 'failed';
  timestamp: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Widget-specific configurations
export interface BookingWidgetConfig extends WidgetConfig {
  serviceId?: string;
  serviceIds?: string[];
  staffId?: string;
  showPricing?: boolean;
  allowGuestBooking?: boolean;
  defaultDuration?: number;
  onBookingComplete?: (booking: BookingResult) => void;
  onBookingCancelled?: (bookingId: string) => void;
}

export interface ProductCatalogWidgetConfig extends WidgetConfig {
  categoryId?: string;
  showCart?: boolean;
  showFilters?: boolean;
  productsPerPage?: number;
  layout?: 'grid' | 'list';
  onAddToCart?: (item: CartItem) => void;
  onCheckout?: (cart: ShoppingCart) => void;
}

export interface ContactFormWidgetConfig extends WidgetConfig {
  showSubject?: boolean;
  showPhone?: boolean;
  categories?: string[];
  onSubmit?: (result: ContactResult) => void;
}

// Error types
export class WidgetError extends Error {
  constructor(
    message: string,
    public code: string,
    public widgetId?: string
  ) {
    super(message);
    this.name = 'WidgetError';
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}