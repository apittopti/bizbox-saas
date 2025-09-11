# BizBox Payments Plugin

A comprehensive payment processing plugin for the BizBox platform, providing Stripe integration for both platform subscriptions and tenant payments with advanced refund management and webhook support.

## Features

### Core Payment Processing
- **Platform Subscriptions**: Manage SaaS subscriptions through the main Stripe account
- **Tenant Payments**: Process customer payments through Stripe Connect accounts
- **Booking Payments**: Support for deposits, full payments, and remaining balance processing
- **Multi-tenant Isolation**: Complete data separation between tenants

### Advanced Payment Management
- **Retry Logic**: Automatic retry with exponential backoff for transient failures
- **Refund Management**: Comprehensive refund processing with validation and tracking
- **Payment Analytics**: Detailed reporting and analytics for payments and refunds
- **Error Handling**: Intelligent error parsing and recovery strategies

### Webhook Integration
- **Real-time Events**: Comprehensive webhook system for payment events
- **Event Mapping**: Automatic conversion of Stripe events to internal webhooks
- **Delivery Tracking**: Monitor webhook delivery success and failure rates
- **Custom Configuration**: Tenant-specific webhook configuration

## Installation

```bash
npm install @bizbox/payments-plugin
```

## Configuration

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://your-app.com
```

### Plugin Configuration

```json
{
  "stripe": {
    "platformSecretKey": "sk_live_...",
    "webhookSecret": "whsec_...",
    "platformFeePercentage": 0.029,
    "platformFeeFixed": 30
  }
}
```

## Usage

### Basic Payment Processing

```typescript
import { paymentsPlugin } from '@bizbox/payments-plugin';

// Create a booking payment
const result = await paymentsPlugin.createBookingPayment(
  'tenant_123',
  'booking_456',
  'customer_789',
  10000, // £100.00 in pence
  {
    paymentType: 'deposit',
    depositPercentage: 0.3, // 30%
    description: 'Booking deposit for car valeting service'
  }
);

if (result.success) {
  console.log('Payment created:', result.bookingPayment);
  console.log('Client secret:', result.clientSecret);
}
```

### Platform Subscription Management

```typescript
// Create platform subscription
const subscription = await stripeIntegration.createPlatformSubscription(
  'tenant_123',
  'price_premium_plan',
  {
    email: 'business@example.com',
    name: 'Business Owner',
    businessName: 'Example Business Ltd'
  }
);
```

### Connected Account Setup

```typescript
// Create Stripe Connect account
const account = await stripeIntegration.createConnectedAccount(
  'tenant_123',
  {
    businessName: 'Example Car Valeting',
    businessType: 'company',
    country: 'GB',
    email: 'payments@example.com',
    website: 'https://example.com'
  }
);

if (account.success) {
  // Redirect user to onboarding
  window.location.href = account.onboardingUrl;
}
```

### Refund Processing

```typescript
// Process refund with validation
const refund = await paymentsPlugin.processRefund(
  'payment_123',
  {
    amount: 5000, // £50.00 partial refund
    reason: 'requested_by_customer',
    initiatedBy: 'tenant',
    tenantId: 'tenant_123'
  }
);

if (refund.success) {
  console.log('Refund processed:', refund.refund);
} else {
  console.error('Refund failed:', refund.error);
  console.log('Validation errors:', refund.validationErrors);
}
```

### Payment Analytics

```typescript
// Generate comprehensive payment report
const report = await paymentsPlugin.generatePaymentReport(
  'tenant_123',
  {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    includeRefunds: true,
    includeFailures: true,
    format: 'json'
  }
);

console.log('Total revenue:', report.report.summary.totalRevenue);
console.log('Success rate:', report.report.summary.successRate);
console.log('Download URL:', report.downloadUrl);
```

### Webhook Configuration

```typescript
// Configure payment webhooks
const webhookConfig = await paymentsPlugin.configureWebhooks(
  'tenant_123',
  {
    url: 'https://your-app.com/webhooks/payments',
    events: [
      'payment.succeeded',
      'payment.failed',
      'booking.payment_succeeded',
      'subscription.payment_succeeded'
    ],
    secret: 'your_webhook_secret',
    enabled: true
  }
);
```

## API Endpoints

### Stripe Integration Routes (`/api/payments/stripe`)

- `POST /connect-account` - Create Stripe Connect account
- `GET /connect-account/status` - Get account status
- `POST /subscription` - Create platform subscription
- `PUT /subscription` - Update subscription
- `DELETE /subscription` - Cancel subscription
- `POST /booking-payment` - Create booking payment
- `POST /booking-payment/remaining-balance` - Process remaining balance
- `POST /refund` - Process refund
- `GET /analytics` - Get payment analytics
- `POST /webhook` - Stripe webhook endpoint

### Payment Management Routes (`/api/payments/management`)

- `POST /refund` - Process refund with validation
- `POST /track` - Track payment status
- `POST /report` - Generate payment report
- `POST /reconcile` - Reconcile payments
- `POST /webhooks/configure` - Configure webhooks
- `GET /webhooks/analytics` - Get webhook analytics
- `GET /failures/analysis` - Analyze payment failures
- `POST /retry/:paymentId` - Retry failed payment
- `GET /health` - Get payment health metrics

## Webhook Events

The plugin triggers the following webhook events:

### Payment Events
- `payment.created` - Payment intent created
- `payment.succeeded` - Payment completed successfully
- `payment.failed` - Payment failed
- `payment.requires_action` - Payment requires customer action
- `payment.refunded` - Payment was refunded

### Booking Events
- `booking.payment_created` - Booking payment created
- `booking.payment_succeeded` - Booking payment successful
- `booking.payment_failed` - Booking payment failed
- `booking.deposit_received` - Deposit payment received
- `booking.payment_completed` - Full booking payment completed

### Subscription Events
- `subscription.created` - Subscription created
- `subscription.updated` - Subscription updated
- `subscription.payment_succeeded` - Subscription payment successful
- `subscription.payment_failed` - Subscription payment failed
- `subscription.canceled` - Subscription canceled

### Account Events
- `account.connected` - Stripe account connected
- `account.activated` - Account activated for payments
- `account.deactivated` - Account deactivated

## Error Handling

The plugin provides comprehensive error handling with retry logic:

```typescript
// Automatic retry with exponential backoff
const result = await paymentManager.processPaymentWithRetry(
  async () => {
    return await somePaymentOperation();
  },
  {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  }
);

if (!result.success) {
  console.log('Error type:', result.error.type);
  console.log('Retryable:', result.error.retryable);
  console.log('Attempts made:', result.attempts);
}
```

## Database Schema

The plugin creates the following tables:

- `connected_accounts` - Stripe Connect account information
- `platform_subscriptions` - Platform subscription data
- `payment_intents` - General payment records
- `booking_payments` - Booking-specific payments
- `refunds` - Refund tracking
- `payment_events` - Webhook event log

All tables include tenant isolation via Row Level Security (RLS).

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- stripe-integration.test.ts
```

## Security

- **PCI DSS Compliance**: All payment processing through Stripe
- **Tenant Isolation**: Database-level data separation
- **Webhook Security**: Signature verification for all webhooks
- **Input Validation**: Comprehensive request validation with Zod
- **Rate Limiting**: Built-in rate limiting for API endpoints

## Monitoring

The plugin provides comprehensive monitoring capabilities:

- Payment success/failure rates
- Webhook delivery analytics
- Refund tracking and analysis
- Platform fee collection monitoring
- Payment reconciliation reports

## Support

For issues and questions:

1. Check the [documentation](https://docs.bizbox.com/payments)
2. Review [common issues](https://docs.bizbox.com/payments/troubleshooting)
3. Contact support at support@bizbox.com

## License

MIT License - see LICENSE file for details.