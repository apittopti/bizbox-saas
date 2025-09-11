/**
 * Data generators for k6 performance tests
 */

export function generateTenantData(count = 10) {
  const tenants = [];
  const plans = ['BASIC', 'PROFESSIONAL', 'ENTERPRISE'];
  
  for (let i = 0; i < count; i++) {
    const plan = plans[i % plans.length];
    tenants.push({
      id: `test-tenant-${i}`,
      name: `Test Tenant ${i}`,
      domain: `tenant-${i}.bizbox.local`,
      plan: plan,
      adminEmail: `admin+test-tenant-${i}@test.bizbox.com`,
      authToken: null
    });
  }
  
  return tenants;
}

export function generateBookingData() {
  return {
    serviceId: `service-${Math.floor(Math.random() * 10) + 1}`,
    startTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    duration: [30, 45, 60, 90, 120][Math.floor(Math.random() * 5)],
    customerName: `Customer ${Math.floor(Math.random() * 1000)}`,
    customerEmail: `customer${Math.floor(Math.random() * 1000)}@example.com`,
    notes: 'Test booking from load test'
  };
}

export function generateProductData() {
  const products = [
    'Laptop', 'Phone', 'Tablet', 'Watch', 'Headphones',
    'Camera', 'Speaker', 'Monitor', 'Keyboard', 'Mouse'
  ];
  
  return {
    name: products[Math.floor(Math.random() * products.length)],
    description: 'Test product for load testing',
    price: Math.floor(Math.random() * 50000) + 1000, // $10-$500
    sku: `TEST-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    inventory: Math.floor(Math.random() * 100) + 1,
    category: 'Electronics'
  };
}

export function generateOrderData() {
  const itemCount = Math.floor(Math.random() * 3) + 1;
  const items = [];
  
  for (let i = 0; i < itemCount; i++) {
    items.push({
      productId: `product-${Math.floor(Math.random() * 100) + 1}`,
      quantity: Math.floor(Math.random() * 3) + 1,
      price: Math.floor(Math.random() * 10000) + 500 // $5-$100
    });
  }
  
  return {
    items,
    shippingAddress: {
      firstName: 'Test',
      lastName: 'Customer',
      street: '123 Test St',
      city: 'Test City',
      state: 'CA',
      zipCode: '12345',
      country: 'US'
    }
  };
}

export function generatePageData() {
  const pageTypes = ['About', 'Services', 'Contact', 'Blog', 'FAQ'];
  const pageType = pageTypes[Math.floor(Math.random() * pageTypes.length)];
  
  return {
    title: `${pageType} Page`,
    slug: `${pageType.toLowerCase()}-${Math.random().toString(36).substr(2, 6)}`,
    content: {
      blocks: [
        {
          type: 'heading',
          content: { text: `Welcome to ${pageType}`, level: 'h1' }
        },
        {
          type: 'paragraph',
          content: { text: 'This is a test page generated during load testing.' }
        }
      ]
    }
  };
}

export function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function randomString(length = 10) {
  return Math.random().toString(36).substr(2, length);
}

export function randomNumber(min = 1, max = 100) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomDate(daysFromNow = 30) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + Math.random() * daysFromNow * 24 * 60 * 60 * 1000);
  return futureDate.toISOString();
}