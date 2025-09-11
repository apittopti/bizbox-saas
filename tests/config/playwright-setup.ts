/**
 * Playwright global setup for E2E testing
 * Sets up test environment, authentication, and test data
 */
import { chromium, FullConfig } from '@playwright/test';
import { TestDatabase } from '../utils/test-database';
import { TenantTestContext } from '../utils/tenant-test-context';

async function globalSetup(config: FullConfig) {
  console.log('🎭 Setting up Playwright test environment...');

  try {
    // Set up test database
    const testDb = new TestDatabase();
    await testDb.setup();
    
    // Set environment variables
    process.env.DATABASE_URL = testDb.getConnectionString();
    process.env.NODE_ENV = 'test';
    process.env.SKIP_WEBHOOKS = 'true';
    process.env.DISABLE_RATE_LIMITING = 'true';

    // Create test tenants and users
    const tenantContext = new TenantTestContext();
    await tenantContext.createTestTenants();

    // Launch browser for authentication setup
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Pre-authenticate test users
    await setupAuthentication(page, tenantContext);

    await browser.close();

    console.log('✅ Playwright setup complete!');
  } catch (error) {
    console.error('❌ Playwright setup failed:', error);
    throw error;
  }
}

async function setupAuthentication(page: any, tenantContext: TenantTestContext) {
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
  const testTenants = tenantContext.getTestTenants();

  for (const tenant of testTenants) {
    // Login as tenant admin
    await page.goto(`${baseURL}/login`);
    await page.fill('[data-testid="email"]', tenant.adminEmail);
    await page.fill('[data-testid="password"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');

    // Wait for successful login
    await page.waitForURL('**/dashboard');

    // Save authentication state
    await page.context().storageState({ 
      path: `tests/fixtures/auth-${tenant.id}.json` 
    });
  }
}

export default globalSetup;