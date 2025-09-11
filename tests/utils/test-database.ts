/**
 * Test Database utility for BizBox testing infrastructure
 * Manages isolated test database instances with proper cleanup
 */
import { randomUUID } from 'crypto';
import { Client } from 'pg';

export class TestDatabase {
  private databaseName: string;
  private connectionString: string;
  private mainClient?: Client;

  constructor() {
    this.databaseName = `bizbox_test_${randomUUID().replace(/-/g, '_')}`;
    this.connectionString = this.buildConnectionString();
  }

  /**
   * Set up test database with proper isolation
   */
  async setup(): Promise<void> {
    console.log(`Creating test database: ${this.databaseName}`);

    // Connect to postgres database to create test database
    const postgresUrl = process.env.POSTGRES_URL || 'postgresql://localhost:5432/postgres';
    this.mainClient = new Client({ connectionString: postgresUrl });
    
    await this.mainClient.connect();

    // Create test database
    await this.mainClient.query(`CREATE DATABASE "${this.databaseName}"`);
    
    // Close connection to postgres database
    await this.mainClient.end();

    console.log(`✅ Test database created: ${this.databaseName}`);
  }

  /**
   * Clean up test database
   */
  async cleanup(): Promise<void> {
    if (!this.databaseName) return;

    console.log(`Cleaning up test database: ${this.databaseName}`);

    try {
      // Connect to postgres database to drop test database
      const postgresUrl = process.env.POSTGRES_URL || 'postgresql://localhost:5432/postgres';
      const client = new Client({ connectionString: postgresUrl });
      
      await client.connect();

      // Terminate connections to test database
      await client.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `, [this.databaseName]);

      // Drop test database
      await client.query(`DROP DATABASE IF EXISTS "${this.databaseName}"`);
      await client.end();

      console.log(`✅ Test database cleaned up: ${this.databaseName}`);
    } catch (error) {
      console.error(`❌ Failed to cleanup test database: ${error}`);
    }
  }

  /**
   * Get connection string for test database
   */
  getConnectionString(): string {
    return this.connectionString;
  }

  /**
   * Get test database name
   */
  getDatabaseName(): string {
    return this.databaseName;
  }

  /**
   * Create a database client for the test database
   */
  async createClient(): Promise<Client> {
    const client = new Client({ connectionString: this.connectionString });
    await client.connect();
    return client;
  }

  /**
   * Execute SQL query on test database
   */
  async query(sql: string, params?: any[]): Promise<any> {
    const client = await this.createClient();
    try {
      const result = await client.query(sql, params);
      return result;
    } finally {
      await client.end();
    }
  }

  /**
   * Truncate all tables for test isolation
   */
  async truncateAllTables(): Promise<void> {
    const client = await this.createClient();
    try {
      // Get all table names
      const result = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename != 'information_schema'
      `);

      const tables = result.rows.map(row => row.tablename);

      if (tables.length > 0) {
        // Disable triggers temporarily
        await client.query('SET session_replication_role = replica');

        // Truncate all tables
        await client.query(`TRUNCATE TABLE ${tables.join(', ')} CASCADE`);

        // Re-enable triggers
        await client.query('SET session_replication_role = DEFAULT');
      }
    } finally {
      await client.end();
    }
  }

  /**
   * Build connection string for test database
   */
  private buildConnectionString(): string {
    const baseUrl = process.env.POSTGRES_URL || 'postgresql://localhost:5432';
    const url = new URL(baseUrl);
    url.pathname = `/${this.databaseName}`;
    return url.toString();
  }
}