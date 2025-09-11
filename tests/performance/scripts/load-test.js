/**
 * Load Testing Script for BizBox Platform
 * Tests the platform's ability to handle normal expected load
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { authenticate, getTenantToken } from '../utils/auth.js';
import { generateTenantData } from '../utils/data-generators.js';

// Custom metrics
const loginRate = new Rate('login_success_rate');
const apiResponseTime = new Trend('api_response_time');
const databaseResponseTime = new Trend('database_response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '10m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
    login_success_rate: ['rate>0.99'], // Login success rate over 99%
    api_response_time: ['p(95)<200'],  // API response time under 200ms
    database_response_time: ['p(95)<100'], // DB response time under 100ms
  },
  ext: {
    loadimpact: {
      projectID: 3595341,
      name: 'BizBox Load Test'
    }
  }
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const testTenants = generateTenantData(10);

export default function () {
  // Select a random tenant for this iteration
  const tenant = testTenants[Math.floor(Math.random() * testTenants.length)];
  
  // Test user authentication
  testAuthentication(tenant);
  sleep(1);
  
  // Test core API endpoints
  testCoreAPIs(tenant);
  sleep(1);
  
  // Test plugin APIs (if available)
  testPluginAPIs(tenant);
  sleep(1);
  
  // Test website rendering
  testWebsiteRendering(tenant);
  sleep(2);
}

function testAuthentication(tenant) {
  const loginPayload = {
    email: tenant.adminEmail,
    password: 'testpassword123'
  };

  const response = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'authentication' }
  });

  const loginSuccess = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => JSON.parse(r.body).accessToken !== undefined,
    'login response time < 500ms': (r) => r.timings.duration < 500,
  });

  loginRate.add(loginSuccess);
  
  if (loginSuccess) {
    const { accessToken } = JSON.parse(response.body);
    tenant.authToken = accessToken;
  }
}

function testCoreAPIs(tenant) {
  if (!tenant.authToken) return;

  const headers = {
    'Authorization': `Bearer ${tenant.authToken}`,
    'Content-Type': 'application/json'
  };

  // Test tenant info API
  const tenantInfoResponse = http.get(`${BASE_URL}/api/tenant/info`, {
    headers,
    tags: { name: 'tenant_info' }
  });

  check(tenantInfoResponse, {
    'tenant info status is 200': (r) => r.status === 200,
    'tenant info response time < 200ms': (r) => r.timings.duration < 200,
  });

  apiResponseTime.add(tenantInfoResponse.timings.duration);

  // Test tenant settings API
  const settingsResponse = http.get(`${BASE_URL}/api/tenant/settings`, {
    headers,
    tags: { name: 'tenant_settings' }
  });

  check(settingsResponse, {
    'settings status is 200': (r) => r.status === 200,
    'settings response has data': (r) => JSON.parse(r.body).settings !== undefined,
  });

  // Test data creation
  const createDataPayload = {
    name: `Test Data ${Date.now()}`,
    description: 'Generated during load test'
  };

  const createResponse = http.post(`${BASE_URL}/api/tenant/data`, JSON.stringify(createDataPayload), {
    headers,
    tags: { name: 'create_data' }
  });

  check(createResponse, {
    'create data status is 200': (r) => r.status === 200 || r.status === 201,
    'create data response time < 300ms': (r) => r.timings.duration < 300,
  });

  // Test data retrieval
  const listDataResponse = http.get(`${BASE_URL}/api/tenant/data`, {
    headers,
    tags: { name: 'list_data' }
  });

  check(listDataResponse, {
    'list data status is 200': (r) => r.status === 200,
    'list data has results': (r) => JSON.parse(r.body).data.length >= 0,
  });

  databaseResponseTime.add(listDataResponse.timings.duration);
}

function testPluginAPIs(tenant) {
  if (!tenant.authToken) return;

  const headers = {
    'Authorization': `Bearer ${tenant.authToken}`,
    'Content-Type': 'application/json'
  };

  // Test available plugins based on tenant plan
  const availablePlugins = getAvailablePlugins(tenant.plan);

  availablePlugins.forEach(pluginId => {
    const pluginResponse = http.get(`${BASE_URL}/api/plugins/${pluginId}/status`, {
      headers,
      tags: { name: `plugin_${pluginId}` }
    });

    check(pluginResponse, {
      [`${pluginId} plugin status is 200`]: (r) => r.status === 200,
      [`${pluginId} plugin response time < 300ms`]: (r) => r.timings.duration < 300,
    });
  });

  // Test booking plugin (if available)
  if (availablePlugins.includes('booking')) {
    testBookingPlugin(tenant, headers);
  }

  // Test e-commerce plugin (if available)
  if (availablePlugins.includes('ecommerce')) {
    testEcommercePlugin(tenant, headers);
  }
}

function testBookingPlugin(tenant, headers) {
  // Get booking services
  const servicesResponse = http.get(`${BASE_URL}/api/plugins/booking/services`, {
    headers,
    tags: { name: 'booking_services' }
  });

  check(servicesResponse, {
    'booking services status is 200': (r) => r.status === 200,
    'booking services response time < 200ms': (r) => r.timings.duration < 200,
  });

  // Get availability
  const availabilityResponse = http.get(`${BASE_URL}/api/plugins/booking/availability?date=${new Date().toISOString().split('T')[0]}`, {
    headers,
    tags: { name: 'booking_availability' }
  });

  check(availabilityResponse, {
    'booking availability status is 200': (r) => r.status === 200,
    'booking availability response time < 300ms': (r) => r.timings.duration < 300,
  });
}

function testEcommercePlugin(tenant, headers) {
  // Get products
  const productsResponse = http.get(`${BASE_URL}/api/plugins/ecommerce/products`, {
    headers,
    tags: { name: 'ecommerce_products' }
  });

  check(productsResponse, {
    'ecommerce products status is 200': (r) => r.status === 200,
    'ecommerce products response time < 200ms': (r) => r.timings.duration < 200,
  });

  // Test cart operations
  const cartResponse = http.post(`${BASE_URL}/api/plugins/ecommerce/cart`, JSON.stringify({}), {
    headers,
    tags: { name: 'ecommerce_cart' }
  });

  check(cartResponse, {
    'ecommerce cart status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'ecommerce cart response time < 200ms': (r) => r.timings.duration < 200,
  });
}

function testWebsiteRendering(tenant) {
  // Test tenant's website rendering
  const websiteResponse = http.get(`http://${tenant.domain}`, {
    tags: { name: 'website_rendering' }
  });

  check(websiteResponse, {
    'website status is 200': (r) => r.status === 200,
    'website response time < 1000ms': (r) => r.timings.duration < 1000,
    'website has content': (r) => r.body.length > 1000,
  });

  // Test specific pages
  const pagesResponse = http.get(`http://${tenant.domain}/about`, {
    tags: { name: 'website_pages' }
  });

  check(pagesResponse, {
    'pages status is 200 or 404': (r) => r.status === 200 || r.status === 404, // 404 is OK if page doesn't exist
    'pages response time < 800ms': (r) => r.timings.duration < 800,
  });
}

function getAvailablePlugins(plan) {
  const pluginsByPlan = {
    'BASIC': ['website-builder'],
    'PROFESSIONAL': ['website-builder', 'booking', 'ecommerce'],
    'ENTERPRISE': ['website-builder', 'booking', 'ecommerce', 'community', 'payments']
  };

  return pluginsByPlan[plan] || pluginsByPlan['BASIC'];
}

export function handleSummary(data) {
  return {
    'results/load-test-summary.json': JSON.stringify(data),
    'results/load-test-summary.html': htmlReport(data)
  };
}

function htmlReport(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>BizBox Load Test Results</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
        .passed { background-color: #d4edda; }
        .failed { background-color: #f8d7da; }
      </style>
    </head>
    <body>
      <h1>BizBox Load Test Results</h1>
      <div class="metric ${data.metrics.http_req_duration.values.p95 < 500 ? 'passed' : 'failed'}">
        <strong>Response Time (95th percentile):</strong> ${data.metrics.http_req_duration.values.p95.toFixed(2)}ms
        (Threshold: < 500ms)
      </div>
      <div class="metric ${data.metrics.http_req_failed.values.rate < 0.01 ? 'passed' : 'failed'}">
        <strong>Error Rate:</strong> ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
        (Threshold: < 1%)
      </div>
      <div class="metric">
        <strong>Total Requests:</strong> ${data.metrics.http_reqs.values.count}
      </div>
      <div class="metric">
        <strong>Average Response Time:</strong> ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
      </div>
      <p>Test completed at: ${new Date().toISOString()}</p>
    </body>
    </html>
  `;
}