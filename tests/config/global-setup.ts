/**
 * Global Jest setup for BizBox testing infrastructure
 * Handles test database setup, Redis connections, and other global resources
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { TestDatabase } from '../utils/test-database';
import { TestRedis } from '../utils/test-redis';

const execAsync = promisify(exec);

export default async function globalSetup(): Promise<void> {
  console.log('🚀 Setting up BizBox test environment...');

  try {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
    process.env.DISABLE_RATE_LIMITING = 'true';
    process.env.SKIP_WEBHOOKS = 'true';

    // Initialize test database
    console.log('📊 Setting up test database...');
    const testDb = new TestDatabase();
    await testDb.setup();
    
    // Store database URL for tests
    process.env.DATABASE_URL = testDb.getConnectionString();
    process.env.TEST_DATABASE_NAME = testDb.getDatabaseName();

    // Initialize test Redis instance
    console.log('🔴 Setting up test Redis...');
    const testRedis = new TestRedis();
    await testRedis.setup();
    process.env.REDIS_URL = testRedis.getConnectionString();

    // Run database migrations
    console.log('🔄 Running database migrations...');
    await execAsync('npm run db:migrate', {
      env: { ...process.env, DATABASE_URL: testDb.getConnectionString() }
    });

    // Seed test data
    console.log('🌱 Seeding test data...');
    await execAsync('npm run db:seed:test', {
      env: { ...process.env, DATABASE_URL: testDb.getConnectionString() }
    });

    console.log('✅ Test environment setup complete!');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
}