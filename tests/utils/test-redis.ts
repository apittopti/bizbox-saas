/**
 * Test Redis utility for BizBox testing infrastructure
 * Manages isolated Redis instances for testing
 */
import { createClient, RedisClientType } from 'redis';

export class TestRedis {
  private client?: RedisClientType;
  private connectionString: string;
  private keyPrefix: string;

  constructor() {
    this.keyPrefix = `bizbox_test_${Date.now()}_`;
    this.connectionString = process.env.REDIS_TEST_URL || 'redis://localhost:6379/15';
  }

  /**
   * Set up test Redis instance
   */
  async setup(): Promise<void> {
    console.log('Setting up test Redis instance...');

    this.client = createClient({
      url: this.connectionString
    });

    await this.client.connect();
    
    // Clear any existing test data
    await this.flushTestData();

    console.log('✅ Test Redis instance ready');
  }

  /**
   * Clean up test Redis instance
   */
  async cleanup(): Promise<void> {
    if (!this.client) return;

    console.log('Cleaning up test Redis instance...');

    try {
      // Clear test data
      await this.flushTestData();
      
      // Close connection
      await this.client.quit();
    } catch (error) {
      console.error('❌ Failed to cleanup test Redis:', error);
    }
  }

  /**
   * Get Redis connection string
   */
  getConnectionString(): string {
    return this.connectionString;
  }

  /**
   * Get Redis client with test prefix
   */
  getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call setup() first.');
    }
    return this.client;
  }

  /**
   * Set a value with test prefix
   */
  async set(key: string, value: string, options?: any): Promise<void> {
    const prefixedKey = this.keyPrefix + key;
    await this.client?.set(prefixedKey, value, options);
  }

  /**
   * Get a value with test prefix
   */
  async get(key: string): Promise<string | null> {
    const prefixedKey = this.keyPrefix + key;
    return await this.client?.get(prefixedKey) || null;
  }

  /**
   * Delete a key with test prefix
   */
  async del(key: string): Promise<void> {
    const prefixedKey = this.keyPrefix + key;
    await this.client?.del(prefixedKey);
  }

  /**
   * Check if key exists with test prefix
   */
  async exists(key: string): Promise<boolean> {
    const prefixedKey = this.keyPrefix + key;
    const result = await this.client?.exists(prefixedKey);
    return result === 1;
  }

  /**
   * Set expiration on a key with test prefix
   */
  async expire(key: string, seconds: number): Promise<void> {
    const prefixedKey = this.keyPrefix + key;
    await this.client?.expire(prefixedKey, seconds);
  }

  /**
   * Hash operations with test prefix
   */
  async hset(key: string, field: string, value: string): Promise<void> {
    const prefixedKey = this.keyPrefix + key;
    await this.client?.hSet(prefixedKey, field, value);
  }

  async hget(key: string, field: string): Promise<string | undefined> {
    const prefixedKey = this.keyPrefix + key;
    return await this.client?.hGet(prefixedKey, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const prefixedKey = this.keyPrefix + key;
    return await this.client?.hGetAll(prefixedKey) || {};
  }

  /**
   * List operations with test prefix
   */
  async lpush(key: string, ...values: string[]): Promise<void> {
    const prefixedKey = this.keyPrefix + key;
    await this.client?.lPush(prefixedKey, values);
  }

  async rpop(key: string): Promise<string | null> {
    const prefixedKey = this.keyPrefix + key;
    return await this.client?.rPop(prefixedKey) || null;
  }

  async llen(key: string): Promise<number> {
    const prefixedKey = this.keyPrefix + key;
    return await this.client?.lLen(prefixedKey) || 0;
  }

  /**
   * Clear all test data
   */
  private async flushTestData(): Promise<void> {
    if (!this.client) return;

    try {
      // Get all keys with test prefix
      const keys = await this.client.keys(this.keyPrefix + '*');
      
      if (keys.length > 0) {
        // Delete all test keys
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Failed to flush test data:', error);
    }
  }

  /**
   * Reset test data between tests
   */
  async reset(): Promise<void> {
    await this.flushTestData();
  }
}