/**
 * Multi-Tenant Load Testing Script
 * Tests tenant isolation and concurrent tenant operations
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { generateTenantData, generateBookingData, generateProductData } from '../utils/data-generators.js';
import { authenticate, createAuthHeaders } from '../utils/auth.js';

// Custom metrics
const tenantIsolationRate = new Rate('tenant_isolation_success_rate');
const concurrentTenantOperations = new Counter('concurrent_tenant_operations');
const crossTenantLeakage = new Counter('cross_tenant_data_leakage');
const tenantSwitchTime = new Trend('tenant_switch_time');

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // 20 users across multiple tenants
    { duration: '5m', target: 50 },   // 50 users across multiple tenants
    { duration: '2m', target: 100 },  // 100 users across multiple tenants
    { duration: '5m', target: 100 },  // Sustain load
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],        // Slower threshold for multi-tenant complexity
    http_req_failed: ['rate<0.02'],          // Allow slightly higher error rate
    tenant_isolation_success_rate: ['rate>0.99'], // Critical: tenant isolation must work
    cross_tenant_data_leakage: ['count<1'],  // Zero tolerance for data leakage
    tenant_switch_time: ['p(95)<1000'],      // Tenant switching should be fast
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const testTenants = generateTenantData(20); // Create 20 test tenants

export default function () {
  // Select random tenant for this virtual user
  const primaryTenant = testTenants[Math.floor(Math.random() * testTenants.length)];
  const secondaryTenant = testTenants[Math.floor(Math.random() * testTenants.length)];
  
  // Ensure we're testing with different tenants
  if (primaryTenant.id === secondaryTenant.id) {
    return; // Skip if same tenant (rare case)
  }

  // Test 1: Basic tenant operations
  testTenantOperations(primaryTenant);
  sleep(1);

  // Test 2: Tenant isolation
  testTenantIsolation(primaryTenant, secondaryTenant);
  sleep(1);

  // Test 3: Concurrent operations
  testConcurrentOperations([primaryTenant, secondaryTenant]);
  sleep(1);

  // Test 4: Rapid tenant switching
  testTenantSwitching([primaryTenant, secondaryTenant]);
  sleep(2);
}

function testTenantOperations(tenant) {
  // Authenticate
  const token = authenticate(tenant.adminEmail, 'testpassword123');
  if (!token) return;

  const headers = createAuthHeaders(token);

  // Create tenant-specific data
  const testData = {
    name: `Test Data ${Date.now()}`,
    tenantId: tenant.id,
    metadata: { source: 'load-test' }
  };

  const createResponse = http.post(`${BASE_URL}/api/tenant/data`, JSON.stringify(testData), {
    headers,
    tags: { name: 'tenant_create_data', tenant: tenant.id }
  });

  check(createResponse, {
    'data creation successful': (r) => r.status === 200 || r.status === 201,
    'data creation response time ok': (r) => r.timings.duration < 500,
  });

  // Retrieve tenant data
  const retrieveResponse = http.get(`${BASE_URL}/api/tenant/data`, {
    headers,
    tags: { name: 'tenant_retrieve_data', tenant: tenant.id }
  });

  check(retrieveResponse, {
    'data retrieval successful': (r) => r.status === 200,
    'data belongs to correct tenant': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data.every(item => item.tenantId === tenant.id);
      } catch (e) {
        return false;
      }
    }
  });

  concurrentTenantOperations.add(1);
}

function testTenantIsolation(tenantA, tenantB) {
  const startTime = Date.now();

  // Authenticate as tenant A
  const tokenA = authenticate(tenantA.adminEmail, 'testpassword123');
  if (!tokenA) return;

  // Authenticate as tenant B
  const tokenB = authenticate(tenantB.adminEmail, 'testpassword123');
  if (!tokenB) return;

  const headersA = createAuthHeaders(tokenA);
  const headersB = createAuthHeaders(tokenB);

  // Create data for tenant A
  const dataA = {
    name: `Tenant A Sensitive Data ${Date.now()}`,
    tenantId: tenantA.id,
    secret: 'tenant-a-secret'
  };

  const createResponseA = http.post(`${BASE_URL}/api/tenant/data`, JSON.stringify(dataA), {
    headers: headersA,
    tags: { name: 'isolation_test_create_a', tenant: tenantA.id }
  });

  // Create data for tenant B
  const dataB = {
    name: `Tenant B Sensitive Data ${Date.now()}`,
    tenantId: tenantB.id,
    secret: 'tenant-b-secret'
  };

  const createResponseB = http.post(`${BASE_URL}/api/tenant/data`, JSON.stringify(dataB), {
    headers: headersB,
    tags: { name: 'isolation_test_create_b', tenant: tenantB.id }
  });

  sleep(0.5); // Allow data to be indexed

  // Tenant A should not see tenant B's data
  const retrieveResponseA = http.get(`${BASE_URL}/api/tenant/data`, {
    headers: headersA,
    tags: { name: 'isolation_test_retrieve_a', tenant: tenantA.id }
  });

  const isolationSuccessA = check(retrieveResponseA, {
    'tenant A cannot see tenant B data': (r) => {
      try {
        const data = JSON.parse(r.body);
        const hasTenantBData = data.data.some(item => 
          item.tenantId === tenantB.id || 
          item.secret === 'tenant-b-secret'
        );
        if (hasTenantBData) {
          crossTenantLeakage.add(1);
        }
        return !hasTenantBData;
      } catch (e) {
        return false;
      }
    }
  });

  // Tenant B should not see tenant A's data
  const retrieveResponseB = http.get(`${BASE_URL}/api/tenant/data`, {
    headers: headersB,
    tags: { name: 'isolation_test_retrieve_b', tenant: tenantB.id }
  });

  const isolationSuccessB = check(retrieveResponseB, {
    'tenant B cannot see tenant A data': (r) => {
      try {
        const data = JSON.parse(r.body);
        const hasTenantAData = data.data.some(item => 
          item.tenantId === tenantA.id || 
          item.secret === 'tenant-a-secret'
        );
        if (hasTenantAData) {
          crossTenantLeakage.add(1);
        }
        return !hasTenantAData;
      } catch (e) {
        return false;
      }
    }
  });

  const isolationTime = Date.now() - startTime;
  tenantSwitchTime.add(isolationTime);
  tenantIsolationRate.add(isolationSuccessA && isolationSuccessB);
}

function testConcurrentOperations(tenants) {
  const operations = [];

  // Create concurrent operations for each tenant
  tenants.forEach(tenant => {
    const token = authenticate(tenant.adminEmail, 'testpassword123');
    if (!token) return;

    const headers = createAuthHeaders(token);

    // Simulate multiple concurrent operations
    operations.push(() => {
      // Plugin-specific operations based on tenant plan
      if (tenant.plan === 'PROFESSIONAL' || tenant.plan === 'ENTERPRISE') {
        testBookingOperations(tenant, headers);
        testEcommerceOperations(tenant, headers);
      }
      testWebsiteOperations(tenant, headers);
    });
  });

  // Execute all operations concurrently
  const startTime = Date.now();
  operations.forEach(op => op());
  const endTime = Date.now();

  check(null, {
    'concurrent operations completed in reasonable time': () => (endTime - startTime) < 5000
  });

  concurrentTenantOperations.add(operations.length);
}

function testBookingOperations(tenant, headers) {
  const bookingData = generateBookingData();
  bookingData.tenantId = tenant.id;

  const response = http.post(`${BASE_URL}/api/plugins/booking/bookings`, JSON.stringify(bookingData), {
    headers,
    tags: { name: 'concurrent_booking', tenant: tenant.id }
  });

  check(response, {
    'booking creation successful': (r) => r.status === 200 || r.status === 201,
    'booking response time acceptable': (r) => r.timings.duration < 800,
  });
}

function testEcommerceOperations(tenant, headers) {
  const productData = generateProductData();
  productData.tenantId = tenant.id;

  const response = http.post(`${BASE_URL}/api/plugins/ecommerce/products`, JSON.stringify(productData), {
    headers,
    tags: { name: 'concurrent_product', tenant: tenant.id }
  });

  check(response, {
    'product creation successful': (r) => r.status === 200 || r.status === 201,
    'product response time acceptable': (r) => r.timings.duration < 800,
  });
}

function testWebsiteOperations(tenant, headers) {
  const response = http.get(`${BASE_URL}/api/plugins/website-builder/pages`, {
    headers,
    tags: { name: 'concurrent_pages', tenant: tenant.id }
  });

  check(response, {
    'pages retrieval successful': (r) => r.status === 200,
    'pages response time acceptable': (r) => r.timings.duration < 500,
  });
}

function testTenantSwitching(tenants) {
  const switchStartTime = Date.now();
  
  // Rapidly switch between tenants
  for (let i = 0; i < tenants.length; i++) {
    const tenant = tenants[i];
    const token = authenticate(tenant.adminEmail, 'testpassword123');
    
    if (token) {
      const headers = createAuthHeaders(token);
      
      // Quick operation to verify tenant context
      const response = http.get(`${BASE_URL}/api/tenant/info`, {
        headers,
        tags: { name: 'tenant_switch', tenant: tenant.id }
      });

      check(response, {
        'tenant info matches expected tenant': (r) => {
          try {
            const data = JSON.parse(r.body);
            return data.tenantId === tenant.id;
          } catch (e) {
            return false;
          }
        }
      });
    }

    sleep(0.1); // Brief pause between switches
  }

  const switchEndTime = Date.now();
  tenantSwitchTime.add(switchEndTime - switchStartTime);
}

export function handleSummary(data) {
  const isolationRate = data.metrics.tenant_isolation_success_rate?.values.rate || 0;
  const leakageCount = data.metrics.cross_tenant_data_leakage?.values.count || 0;
  
  return {
    'results/multi-tenant-load-summary.json': JSON.stringify(data),
    'results/multi-tenant-load-report.html': htmlReport(data, isolationRate, leakageCount)
  };
}

function htmlReport(data, isolationRate, leakageCount) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>BizBox Multi-Tenant Load Test Results</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
        .passed { background-color: #d4edda; }
        .failed { background-color: #f8d7da; }
        .critical { background-color: #f5c6cb; border-color: #f1b0b7; }
      </style>
    </head>
    <body>
      <h1>BizBox Multi-Tenant Load Test Results</h1>
      
      <h2>Critical Security Metrics</h2>
      <div class="metric ${isolationRate > 0.99 ? 'passed' : 'critical'}">
        <strong>Tenant Isolation Success Rate:</strong> ${(isolationRate * 100).toFixed(2)}%
        (Threshold: > 99%)
      </div>
      <div class="metric ${leakageCount === 0 ? 'passed' : 'critical'}">
        <strong>Cross-Tenant Data Leakage:</strong> ${leakageCount} incidents
        (Threshold: 0 incidents)
      </div>
      
      <h2>Performance Metrics</h2>
      <div class="metric ${data.metrics.http_req_duration.values.p95 < 800 ? 'passed' : 'failed'}">
        <strong>Response Time (95th percentile):</strong> ${data.metrics.http_req_duration.values.p95.toFixed(2)}ms
        (Threshold: < 800ms)
      </div>
      <div class="metric">
        <strong>Concurrent Tenant Operations:</strong> ${data.metrics.concurrent_tenant_operations?.values.count || 0}
      </div>
      <div class="metric">
        <strong>Average Tenant Switch Time:</strong> ${data.metrics.tenant_switch_time?.values.avg?.toFixed(2) || 'N/A'}ms
      </div>
      
      <p><strong>Test completed at:</strong> ${new Date().toISOString()}</p>
      
      ${leakageCount > 0 ? '<p style="color: red;"><strong>WARNING:</strong> Cross-tenant data leakage detected! Immediate investigation required.</p>' : ''}
    </body>
    </html>
  `;
}