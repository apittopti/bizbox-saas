/**
 * Plugin Data Factory for generating test data for various plugins
 * Provides realistic test data for booking, e-commerce, and website builder plugins
 */
import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';

// Booking Plugin Types
export interface BookingService {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  duration: number; // minutes
  price: number; // cents
  category: string;
  isActive: boolean;
  staffIds: string[];
  settings: any;
}

export interface Booking {
  id: string;
  tenantId: string;
  customerId: string;
  serviceId: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
  price: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
}

// E-commerce Plugin Types
export interface Product {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  price: number; // cents
  compareAtPrice?: number;
  sku: string;
  inventory: number;
  categoryId: string;
  images: string[];
  status: 'active' | 'draft' | 'archived';
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  price: number;
  sku: string;
  inventory: number;
  attributes: Record<string, string>;
}

export interface Order {
  id: string;
  tenantId: string;
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  shippingAddress: Address;
  billingAddress: Address;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Address {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

// Website Builder Types
export interface Page {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  content: PageContent;
  status: 'draft' | 'published' | 'archived';
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImage?: string;
  };
  settings: {
    showInNav: boolean;
    navOrder: number;
    requireAuth: boolean;
  };
}

export interface PageContent {
  blocks: ContentBlock[];
  theme: string;
  customCss?: string;
}

export interface ContentBlock {
  id: string;
  type: string;
  content: any;
  styles?: Record<string, any>;
  settings?: Record<string, any>;
}

export class PluginDataFactory {
  /**
   * Create booking service data
   */
  static createBookingService(tenantId: string, options: Partial<BookingService> = {}): BookingService {
    return {
      id: options.id || `service_${randomUUID()}`,
      tenantId,
      name: options.name || faker.commerce.productName(),
      description: options.description || faker.commerce.productDescription(),
      duration: options.duration || faker.helpers.arrayElement([30, 45, 60, 90, 120]),
      price: options.price || faker.number.int({ min: 2500, max: 20000 }), // $25-$200
      category: options.category || faker.helpers.arrayElement(['Consultation', 'Service', 'Treatment', 'Class']),
      isActive: options.isActive !== undefined ? options.isActive : true,
      staffIds: options.staffIds || [],
      settings: {
        allowOnlineBooking: true,
        requireApproval: faker.datatype.boolean(),
        advanceBookingDays: faker.number.int({ min: 1, max: 90 }),
        cancellationPolicy: faker.number.int({ min: 2, max: 48 }),
        ...options.settings
      }
    };
  }

  /**
   * Create booking data
   */
  static createBooking(tenantId: string, options: Partial<Booking> = {}): Booking {
    const startTime = options.startTime || faker.date.future({ years: 1 });
    const duration = faker.helpers.arrayElement([30, 45, 60, 90, 120]);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    return {
      id: options.id || `booking_${randomUUID()}`,
      tenantId,
      customerId: options.customerId || `customer_${randomUUID()}`,
      serviceId: options.serviceId || `service_${randomUUID()}`,
      staffId: options.staffId || `staff_${randomUUID()}`,
      startTime,
      endTime,
      status: options.status || faker.helpers.arrayElement(['pending', 'confirmed', 'completed', 'cancelled']),
      notes: options.notes || faker.lorem.sentence(),
      price: options.price || faker.number.int({ min: 2500, max: 20000 }),
      paymentStatus: options.paymentStatus || faker.helpers.arrayElement(['pending', 'paid', 'refunded'])
    };
  }

  /**
   * Create multiple booking services
   */
  static createBookingServices(tenantId: string, count: number): BookingService[] {
    return Array.from({ length: count }, () => this.createBookingService(tenantId));
  }

  /**
   * Create multiple bookings
   */
  static createBookings(tenantId: string, count: number): Booking[] {
    return Array.from({ length: count }, () => this.createBooking(tenantId));
  }

  /**
   * Create product data
   */
  static createProduct(tenantId: string, options: Partial<Product> = {}): Product {
    const name = options.name || faker.commerce.productName();
    const price = options.price || faker.number.int({ min: 999, max: 99999 }); // $9.99-$999.99

    return {
      id: options.id || `product_${randomUUID()}`,
      tenantId,
      name,
      description: options.description || faker.commerce.productDescription(),
      price,
      compareAtPrice: options.compareAtPrice || (faker.datatype.boolean() ? price + faker.number.int({ min: 500, max: 2000 }) : undefined),
      sku: options.sku || faker.string.alphanumeric(8).toUpperCase(),
      inventory: options.inventory !== undefined ? options.inventory : faker.number.int({ min: 0, max: 100 }),
      categoryId: options.categoryId || `category_${randomUUID()}`,
      images: options.images || Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => 
        faker.image.url({ width: 800, height: 600 })
      ),
      status: options.status || faker.helpers.arrayElement(['active', 'draft', 'archived']),
      seo: {
        title: `${name} | SEO Title`,
        description: faker.lorem.sentences(2),
        keywords: Array.from({ length: 5 }, () => faker.commerce.productAdjective())
      },
      variants: options.variants
    };
  }

  /**
   * Create product variant
   */
  static createProductVariant(productId: string, options: Partial<ProductVariant> = {}): ProductVariant {
    return {
      id: options.id || `variant_${randomUUID()}`,
      productId,
      name: options.name || faker.commerce.productMaterial(),
      price: options.price || faker.number.int({ min: 999, max: 99999 }),
      sku: options.sku || faker.string.alphanumeric(8).toUpperCase(),
      inventory: options.inventory !== undefined ? options.inventory : faker.number.int({ min: 0, max: 50 }),
      attributes: options.attributes || {
        size: faker.helpers.arrayElement(['S', 'M', 'L', 'XL']),
        color: faker.color.human()
      }
    };
  }

  /**
   * Create order data
   */
  static createOrder(tenantId: string, options: Partial<Order> = {}): Order {
    const itemCount = faker.number.int({ min: 1, max: 5 });
    const items = options.items || Array.from({ length: itemCount }, () => this.createOrderItem());
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = Math.round(subtotal * 0.08); // 8% tax
    const shipping = faker.number.int({ min: 0, max: 1500 }); // $0-$15 shipping

    return {
      id: options.id || `order_${randomUUID()}`,
      tenantId,
      customerId: options.customerId || `customer_${randomUUID()}`,
      items,
      subtotal,
      tax,
      shipping,
      total: subtotal + tax + shipping,
      status: options.status || faker.helpers.arrayElement(['pending', 'processing', 'shipped', 'delivered']),
      paymentStatus: options.paymentStatus || faker.helpers.arrayElement(['pending', 'paid', 'refunded']),
      shippingAddress: options.shippingAddress || this.createAddress(),
      billingAddress: options.billingAddress || this.createAddress()
    };
  }

  /**
   * Create order item
   */
  static createOrderItem(options: Partial<OrderItem> = {}): OrderItem {
    const quantity = options.quantity || faker.number.int({ min: 1, max: 5 });
    const price = options.price || faker.number.int({ min: 999, max: 9999 });

    return {
      id: options.id || `item_${randomUUID()}`,
      productId: options.productId || `product_${randomUUID()}`,
      variantId: options.variantId,
      quantity,
      price,
      total: quantity * price
    };
  }

  /**
   * Create address
   */
  static createAddress(): Address {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zipCode: faker.location.zipCode(),
      country: 'US',
      phone: faker.phone.number()
    };
  }

  /**
   * Create multiple products
   */
  static createProducts(tenantId: string, count: number): Product[] {
    return Array.from({ length: count }, () => this.createProduct(tenantId));
  }

  /**
   * Create multiple orders
   */
  static createOrders(tenantId: string, count: number): Order[] {
    return Array.from({ length: count }, () => this.createOrder(tenantId));
  }

  /**
   * Create page data
   */
  static createPage(tenantId: string, options: Partial<Page> = {}): Page {
    const title = options.title || faker.lorem.words(3);
    const slug = options.slug || faker.helpers.slugify(title).toLowerCase();

    return {
      id: options.id || `page_${randomUUID()}`,
      tenantId,
      title,
      slug,
      content: options.content || this.createPageContent(),
      status: options.status || faker.helpers.arrayElement(['draft', 'published', 'archived']),
      seo: {
        title: `${title} | SEO Title`,
        description: faker.lorem.sentences(2),
        keywords: Array.from({ length: 5 }, () => faker.lorem.word()),
        ogImage: faker.image.url({ width: 1200, height: 630 })
      },
      settings: {
        showInNav: faker.datatype.boolean(),
        navOrder: faker.number.int({ min: 1, max: 10 }),
        requireAuth: faker.datatype.boolean()
      }
    };
  }

  /**
   * Create page content with blocks
   */
  static createPageContent(): PageContent {
    const blockCount = faker.number.int({ min: 3, max: 8 });
    const blocks = Array.from({ length: blockCount }, (_, index) => this.createContentBlock(index));

    return {
      blocks,
      theme: faker.helpers.arrayElement(['default', 'modern', 'classic', 'minimal']),
      customCss: faker.datatype.boolean() ? 
        `.custom-class { color: ${faker.internet.color()}; }` : 
        undefined
    };
  }

  /**
   * Create content block
   */
  static createContentBlock(index: number): ContentBlock {
    const blockTypes = ['heading', 'paragraph', 'image', 'button', 'gallery', 'testimonial', 'pricing'];
    const type = faker.helpers.arrayElement(blockTypes);

    const blockContent = {
      'heading': {
        text: faker.lorem.sentence(),
        level: faker.helpers.arrayElement(['h1', 'h2', 'h3']),
        alignment: faker.helpers.arrayElement(['left', 'center', 'right'])
      },
      'paragraph': {
        text: faker.lorem.paragraphs(2),
        alignment: faker.helpers.arrayElement(['left', 'center', 'right', 'justify'])
      },
      'image': {
        src: faker.image.url({ width: 800, height: 400 }),
        alt: faker.lorem.words(3),
        caption: faker.lorem.sentence()
      },
      'button': {
        text: faker.lorem.words(2),
        url: faker.internet.url(),
        style: faker.helpers.arrayElement(['primary', 'secondary', 'outline'])
      },
      'gallery': {
        images: Array.from({ length: faker.number.int({ min: 3, max: 6 }) }, () => ({
          src: faker.image.url({ width: 400, height: 300 }),
          alt: faker.lorem.words(2)
        }))
      },
      'testimonial': {
        quote: faker.lorem.paragraph(),
        author: faker.person.fullName(),
        role: faker.person.jobTitle(),
        avatar: faker.image.avatar()
      },
      'pricing': {
        title: faker.commerce.productName(),
        price: faker.commerce.price(),
        features: Array.from({ length: 5 }, () => faker.lorem.sentence())
      }
    };

    return {
      id: `block_${randomUUID()}`,
      type,
      content: blockContent[type],
      styles: {
        marginTop: faker.number.int({ min: 0, max: 40 }),
        marginBottom: faker.number.int({ min: 0, max: 40 }),
        padding: faker.number.int({ min: 0, max: 20 })
      },
      settings: {
        animation: faker.helpers.arrayElement(['none', 'fade', 'slide', 'bounce']),
        visible: true
      }
    };
  }

  /**
   * Create multiple pages
   */
  static createPages(tenantId: string, count: number): Page[] {
    return Array.from({ length: count }, () => this.createPage(tenantId));
  }

  /**
   * Create complete plugin test data for a tenant
   */
  static createCompletePluginData(tenantId: string) {
    return {
      booking: {
        services: this.createBookingServices(tenantId, 5),
        bookings: this.createBookings(tenantId, 20)
      },
      ecommerce: {
        products: this.createProducts(tenantId, 15),
        orders: this.createOrders(tenantId, 10)
      },
      websiteBuilder: {
        pages: this.createPages(tenantId, 8)
      }
    };
  }

  /**
   * Create plugin data based on tenant plan
   */
  static createPluginDataForPlan(tenantId: string, plan: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE') {
    const data: any = {};

    // Website builder available for all plans
    data.websiteBuilder = {
      pages: this.createPages(tenantId, plan === 'BASIC' ? 5 : plan === 'PROFESSIONAL' ? 15 : 50)
    };

    // Booking available for Professional and Enterprise
    if (plan === 'PROFESSIONAL' || plan === 'ENTERPRISE') {
      data.booking = {
        services: this.createBookingServices(tenantId, plan === 'PROFESSIONAL' ? 10 : 25),
        bookings: this.createBookings(tenantId, plan === 'PROFESSIONAL' ? 50 : 200)
      };
    }

    // E-commerce available for Professional and Enterprise
    if (plan === 'PROFESSIONAL' || plan === 'ENTERPRISE') {
      data.ecommerce = {
        products: this.createProducts(tenantId, plan === 'PROFESSIONAL' ? 100 : 1000),
        orders: this.createOrders(tenantId, plan === 'PROFESSIONAL' ? 25 : 100)
      };
    }

    return data;
  }
}