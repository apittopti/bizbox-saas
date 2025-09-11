# BizBox Widgets

> **Embeddable components for external websites**

BizBox Widgets is a comprehensive JavaScript library that allows business owners to embed BizBox functionality (booking forms, product catalogs, contact forms, etc.) on their existing websites without rebuilding their entire site.

## 🚀 Quick Start

### 1. Include the Script

```html
<script src="https://widgets.bizbox.co.uk/embed.js"></script>
```

### 2. Initialize BizBox

```javascript
BizBox.init({
  tenantId: 'your-tenant-id',
  theme: 'modern',
  apiBaseUrl: 'https://api.bizbox.co.uk'
});
```

### 3. Add Widgets

#### HTML Embedding (Automatic Discovery)
```html
<div id="booking-widget" 
     data-bizbox-widget="booking"
     data-bizbox-config='{"tenantId": "your-tenant-id", "serviceId": "service_123"}'>
</div>
```

#### Programmatic Creation
```javascript
const bookingWidget = BizBox.createBookingWidget('booking-container', {
  tenantId: 'your-tenant-id',
  serviceId: 'service_123',
  onBookingComplete: (booking) => {
    console.log('Booking created:', booking);
  }
});
```

## 📦 Available Widgets

### 🛎️ Booking Widget
Complete appointment booking solution with:
- Multi-step booking process
- Service selection with pricing
- Staff member selection  
- Interactive calendar
- Time slot availability
- Customer details form
- Booking confirmation

```javascript
const bookingWidget = BizBox.createBookingWidget('container-id', {
  tenantId: 'your-tenant-id',
  serviceId: 'service_123', // Optional: specific service
  showPricing: true,
  allowGuestBooking: true,
  onBookingComplete: (booking) => {
    // Handle successful booking
  }
});
```

### 🛍️ Product Catalog Widget
E-commerce solution with shopping cart:
- Product grid and list layouts
- Search and filter functionality
- Product variants support
- Shopping cart integration
- Quantity management
- Pagination support

```javascript
const catalogWidget = BizBox.createProductCatalogWidget('container-id', {
  tenantId: 'your-tenant-id',
  categoryId: 'featured', // Optional: specific category
  showCart: true,
  productsPerPage: 12,
  layout: 'grid', // 'grid' or 'list'
  onAddToCart: (item) => {
    // Handle item added to cart
  },
  onCheckout: (cart) => {
    // Handle checkout initiation
  }
});
```

### 📝 Contact Form Widget
Professional contact forms with validation:
- Real-time validation
- Customizable fields
- Category selection
- Success confirmation
- Error handling

```javascript
const contactWidget = BizBox.createContactFormWidget('container-id', {
  tenantId: 'your-tenant-id',
  showPhone: true,
  showSubject: true,
  categories: ['General', 'Support', 'Sales'],
  onSubmit: (result) => {
    // Handle form submission
  }
});
```

## 🎨 Themes and Customization

### Built-in Themes
- **Modern**: Clean, contemporary design
- **Minimal**: Simple, focused interface
- **Corporate**: Professional business style
- **Creative**: Vibrant, artistic appearance

```javascript
BizBox.init({
  tenantId: 'your-tenant-id',
  theme: 'modern' // or 'minimal', 'corporate', 'creative'
});
```

### Custom Themes
```javascript
BizBox.init({
  tenantId: 'your-tenant-id',
  theme: {
    primaryColor: '#3b82f6',
    secondaryColor: '#6b7280',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    fontFamily: 'system-ui, sans-serif',
    fontSize: '14px'
  }
});
```

### CSS Variables
All widgets respect CSS custom properties for easy customization:

```css
.bizbox-widget {
  --bx-primary: #your-brand-color;
  --bx-secondary: #your-secondary-color;
  --bx-background: #your-background;
  --bx-text: #your-text-color;
  --bx-border: #your-border-color;
  --bx-radius: 8px;
  --bx-font-family: 'Your Font';
  --bx-font-size: 16px;
}
```

## 🔧 Configuration Options

### Global Configuration
```javascript
BizBox.init({
  tenantId: 'your-tenant-id',        // Required: Your BizBox tenant ID
  apiBaseUrl: 'https://api.bizbox.co.uk', // API endpoint
  theme: 'modern',                   // Theme name or object
  debug: false,                      // Enable debug mode
  autoInit: true                     // Auto-discover widgets
});
```

### Widget-Specific Configuration

#### Booking Widget Options
```javascript
{
  tenantId: 'your-tenant-id',
  serviceId: 'service_123',          // Specific service (optional)
  serviceIds: ['service_1', 'service_2'], // Multiple services
  staffId: 'staff_456',              // Specific staff member
  showPricing: true,                 // Display prices
  allowGuestBooking: false,          // Require registration
  defaultDuration: 60,               // Default appointment duration
  onBookingComplete: (booking) => {},
  onBookingCancelled: (bookingId) => {}
}
```

#### Product Catalog Options
```javascript
{
  tenantId: 'your-tenant-id',
  categoryId: 'category_123',        // Specific category
  showCart: true,                    // Show shopping cart
  showFilters: true,                 // Show search/filters
  productsPerPage: 12,               // Pagination size
  layout: 'grid',                    // 'grid' or 'list'
  onAddToCart: (item) => {},
  onCheckout: (cart) => {}
}
```

#### Contact Form Options
```javascript
{
  tenantId: 'your-tenant-id',
  showSubject: true,                 // Show subject field
  showPhone: true,                   // Show phone field
  categories: ['General', 'Support'], // Category options
  onSubmit: (result) => {}
}
```

## 📡 Events

All widgets emit events that you can listen to:

### Global Event Listeners
```javascript
// Listen to all widget events
BizBox.on('*', (event) => {
  console.log('Widget event:', event);
});

// Listen to specific events
BizBox.on('booking:created', (data) => {
  console.log('Booking created:', data);
});

BizBox.on('product:added-to-cart', (data) => {
  console.log('Product added to cart:', data);
});

BizBox.on('contact:submitted', (data) => {
  console.log('Contact form submitted:', data);
});
```

### Widget-Specific Events

#### Booking Widget Events
- `service:selected` - Service was selected
- `staff:selected` - Staff member was selected  
- `timeslot:selected` - Time slot was selected
- `booking:created` - Booking was successfully created
- `booking:cancelled` - Booking was cancelled

#### Product Catalog Events
- `product:added-to-cart` - Product was added to cart
- `product:removed-from-cart` - Product was removed from cart
- `checkout:initiated` - Checkout process started

#### Contact Form Events
- `contact:submitted` - Form was successfully submitted
- `contact:validation-error` - Form validation failed

## 🔒 Security

### API Authentication
All API calls include proper authentication headers:
- `X-Tenant-ID`: Your tenant identifier
- `X-API-Key`: Your API key (if provided)
- `X-Widget-Origin`: Origin domain for CORS validation

### Content Security Policy
Include these CSP directives for proper widget functionality:
```html
<meta http-equiv="Content-Security-Policy" 
      content="script-src 'self' https://widgets.bizbox.co.uk; 
               connect-src 'self' https://api.bizbox.co.uk;
               img-src 'self' https://cdn.bizbox.co.uk data:;">
```

## 📱 Responsive Design

All widgets are fully responsive and work across all devices:
- **Desktop**: Full-featured interface
- **Tablet**: Optimized layouts with touch support
- **Mobile**: Simplified interface for small screens

## 🚀 Performance

### Bundle Size
- **Minified**: ~45KB gzipped
- **Uncompressed**: ~180KB

### Loading Strategy
- Widgets load asynchronously
- Lazy loading for non-critical components
- Efficient caching with 5-minute TTL
- CDN delivery for optimal performance

### Browser Support
- **Modern browsers**: Chrome 70+, Firefox 65+, Safari 12+, Edge 79+
- **Legacy support**: IE11 with polyfills (optional)

## 🛠️ Development

### Local Development

1. **Clone and install dependencies**:
```bash
git clone https://github.com/bizbox/widgets.git
cd widgets
npm install
```

2. **Start development server**:
```bash
npm run dev
```

3. **Build for production**:
```bash
npm run build
```

### Custom Widget Development

Extend the base widget class to create custom widgets:

```javascript
import { BizBoxWidget } from './core/widget-base';

class CustomWidget extends BizBoxWidget {
  async render() {
    this.container.innerHTML = `
      <div class="custom-widget">
        <h3>Custom Widget</h3>
        <p>Your custom functionality here</p>
      </div>
    `;
  }
}

// Register the custom widget
BizBox.registerCustomWidget('custom', CustomWidget);
```

## 📊 Analytics

The widget system includes built-in analytics tracking:

### Automatic Tracking
- Widget loads and initialization
- User interactions and events
- Performance metrics
- Error tracking

### Custom Analytics
```javascript
// Access analytics instance
BizBox.WidgetAnalytics.track('custom:event', {
  userId: 'user_123',
  action: 'custom_action'
});
```

## 🤝 Support

### Documentation
- **Full API Documentation**: https://docs.bizbox.co.uk/widgets
- **Integration Guides**: https://docs.bizbox.co.uk/widgets/integration
- **Theme Customization**: https://docs.bizbox.co.uk/widgets/themes

### Community
- **GitHub Issues**: Report bugs and request features
- **Stack Overflow**: Tag questions with `bizbox-widgets`
- **Discord**: Join our developer community

### Commercial Support
- **Email**: support@bizbox.co.uk
- **Priority Support**: Available with Business and Enterprise plans
- **Custom Development**: Contact sales@bizbox.co.uk

## 📄 License

BizBox Widgets is proprietary software. See LICENSE file for details.

## 🔄 Changelog

### v1.0.0 (Current)
- ✨ Initial release
- 🛎️ Booking widget with full appointment flow
- 🛍️ Product catalog with shopping cart
- 📝 Contact form with validation
- 🎨 Four built-in themes
- 📱 Responsive design
- 🔒 Security features
- 📊 Analytics integration

---

**Made with ❤️ by the BizBox Team**