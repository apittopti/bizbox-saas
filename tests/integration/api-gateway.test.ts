/**
 * API Gateway Integration Tests
 * Tests the core API gateway functionality, authentication, and rate limiting
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { TestDatabase } from '../utils/test-database';
import { TenantTestContext } from '../utils/tenant-test-context';
import { TestRedis } from '../utils/test-redis';
import { createTestApp } from '../utils/test-app';

describe('API Gateway Integration', () => {
  let testDb: TestDatabase;
  let testRedis: TestRedis;
  let tenantContext: TenantTestContext;
  let app: any;
  let authTokens: Record<string, string> = {};

  beforeAll(async () => {
    // Set up test infrastructure
    testDb = new TestDatabase();
    await testDb.setup();

    testRedis = new TestRedis();
    await testRedis.setup();

    tenantContext = new TenantTestContext();
    await tenantContext.createTestTenants();

    // Create test app instance
    app = await createTestApp({
      database: testDb.getConnectionString(),
      redis: testRedis.getConnectionString()
    });

    // Authenticate test users
    for (const tenant of tenantContext.getTestTenants()) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: tenant.adminEmail,
          password: 'testpassword123'
        });
      
      authTokens[tenant.id] = response.body.accessToken;
    }
  });

  afterAll(async () => {
    await testDb.cleanup();
    await testRedis.cleanup();
    await tenantContext.cleanup();
  });

  beforeEach(async () => {
    await testDb.truncateAllTables();
    await testRedis.reset();
  });

  describe('Authentication', () => {
    it('should authenticate valid credentials', async () => {
      const tenant = tenantContext.getTenantByPlan('BASIC');
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: tenant?.adminEmail,
          password: 'testpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toEqual(
        expect.objectContaining({
          email: tenant?.adminEmail,
          tenantId: tenant?.id
        })
      );
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should refresh authentication tokens', async () => {
      const tenant = tenantContext.getTenantByPlan('BASIC');
      
      // Login to get refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: tenant?.adminEmail,
          password: 'testpassword123'
        });

      const { refreshToken } = loginResponse.body;

      // Use refresh token to get new access token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body.accessToken).not.toBe(loginResponse.body.accessToken);
    });
  });

  describe('Authorization', () => {
    it('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/tenant/settings');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('should allow access with valid token', async () => {
      const tenant = tenantContext.getTenantByPlan('BASIC');
      
      const response = await request(app)
        .get('/api/tenant/settings')
        .set('Authorization', `Bearer ${authTokens[tenant!.id]}`);

      expect(response.status).toBe(200);
    });

    it('should enforce tenant isolation', async () => {
      const basicTenant = tenantContext.getTenantByPlan('BASIC');
      const proTenant = tenantContext.getTenantByPlan('PROFESSIONAL');

      // Create data for basic tenant
      await request(app)
        .post('/api/tenant/data')
        .set('Authorization', `Bearer ${authTokens[basicTenant!.id]}`)
        .send({ name: 'Basic Tenant Data' });

      // Try to access basic tenant's data using pro tenant's token
      const response = await request(app)
        .get('/api/tenant/data')
        .set('Authorization', `Bearer ${authTokens[proTenant!.id]}`);

      expect(response.status).toBe(200);
      expect(response.body.data).not.toContainEqual(
        expect.objectContaining({
          name: 'Basic Tenant Data'
        })
      );
    });

    it('should enforce role-based access control', async () => {
      const tenant = tenantContext.getTenantByPlan('BASIC');
      
      // Get staff user token
      const staffLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: `staff+${tenant!.id}@test.bizbox.com`,
          password: 'testpassword123'
        });

      const staffToken = staffLoginResponse.body.accessToken;

      // Try to access admin-only endpoint with staff token
      const response = await request(app)
        .delete('/api/tenant/settings')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits per tenant', async () => {
      const tenant = tenantContext.getTenantByPlan('BASIC');
      const token = authTokens[tenant!.id];

      // Make requests up to rate limit (assuming 100 requests per minute for basic)
      const requests = Array.from({ length: 101 }, (_, i) => 
        request(app)
          .get('/api/tenant/info')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      expect(rateLimitedResponses[0].body).toHaveProperty('error', 'Rate limit exceeded');
    });

    it('should have different rate limits for different plans', async () => {
      const basicTenant = tenantContext.getTenantByPlan('BASIC');
      const enterpriseTenant = tenantContext.getTenantByPlan('ENTERPRISE');

      // Basic tenant should have lower rate limit than enterprise
      // This test would need to be adjusted based on actual rate limits
      expect(basicTenant?.settings.limits.apiCalls).toBeLessThan(
        enterpriseTenant?.settings.limits.apiCalls
      );
    });
  });

  describe('Plugin API Integration', () => {
    it('should route requests to plugin endpoints', async () => {
      const tenant = tenantContext.getTenantByPlan('PROFESSIONAL');
      
      const response = await request(app)
        .get('/api/plugins/booking/services')
        .set('Authorization', `Bearer ${authTokens[tenant!.id]}`);

      expect(response.status).toBe(200);
    });

    it('should enforce plugin permissions per tenant plan', async () => {
      const basicTenant = tenantContext.getTenantByPlan('BASIC');
      
      // Basic plan shouldn't have access to booking plugin
      const response = await request(app)
        .get('/api/plugins/booking/services')
        .set('Authorization', `Bearer ${authTokens[basicTenant!.id]}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Plugin not available for your plan');
    });

    it('should handle plugin initialization errors gracefully', async () => {
      const tenant = tenantContext.getTenantByPlan('PROFESSIONAL');
      
      // Simulate plugin error
      const response = await request(app)
        .get('/api/plugins/nonexistent/test')
        .set('Authorization', `Bearer ${authTokens[tenant!.id]}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Plugin not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // This would require temporarily breaking the database connection
      // Implementation depends on how your app handles DB errors
    });

    it('should handle Redis connection errors', async () => {
      // This would require temporarily breaking the Redis connection
      // Implementation depends on how your app handles Redis errors
    });

    it('should return proper error formats', async () => {
      const response = await request(app)
        .post('/api/tenant/data')
        .send({ invalid: 'data' }); // No auth token

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Health Checks', () => {
    it('should provide health status', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('redis');
    });

    it('should provide plugin status', async () => {
      const response = await request(app)
        .get('/api/health/plugins');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('plugins');
      expect(Array.isArray(response.body.plugins)).toBe(true);
    });
  });
});