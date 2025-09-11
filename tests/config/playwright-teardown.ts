/**
 * Playwright global teardown for E2E testing
 * Cleans up test environment and resources
 */
import { TestDatabase } from '../utils/test-database';
import { TenantTestContext } from '../utils/tenant-test-context';
import { rm } from 'fs/promises';

async function globalTeardown() {
  console.log('🧹 Cleaning up Playwright test environment...');

  try {
    // Clean up authentication files
    try {
      await rm('tests/fixtures/auth-*.json', { force: true });
    } catch {
      // Ignore errors for missing files
    }

    // Clean up test database
    const testDb = new TestDatabase();
    await testDb.cleanup();

    // Clean up tenant context
    const tenantContext = new TenantTestContext();
    await tenantContext.cleanup();

    console.log('✅ Playwright cleanup complete!');
  } catch (error) {
    console.error('❌ Playwright cleanup failed:', error);
    // Don't throw to avoid breaking test runs
  }
}

export default globalTeardown;