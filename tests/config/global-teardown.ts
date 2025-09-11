/**
 * Global Jest teardown for BizBox testing infrastructure
 * Cleans up test database, Redis connections, and other global resources
 */
import { TestDatabase } from '../utils/test-database';
import { TestRedis } from '../utils/test-redis';

export default async function globalTeardown(): Promise<void> {
  console.log('🧹 Cleaning up test environment...');

  try {
    // Clean up test database
    if (process.env.TEST_DATABASE_NAME) {
      console.log('📊 Cleaning up test database...');
      const testDb = new TestDatabase();
      await testDb.cleanup();
    }

    // Clean up test Redis
    if (process.env.REDIS_URL) {
      console.log('🔴 Cleaning up test Redis...');
      const testRedis = new TestRedis();
      await testRedis.cleanup();
    }

    console.log('✅ Test environment cleanup complete!');
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
    // Don't throw to avoid breaking test runs
  }
}