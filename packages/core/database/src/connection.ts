import { Pool, PoolClient } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createPoolConfig, DatabaseConfig, defaultConfig } from './config';

let pool: Pool | null = null;
let db: NodePgDatabase | null = null;

export async function initializeDatabase(config: DatabaseConfig = defaultConfig): Promise<void> {
  if (pool) {
    await pool.end();
  }

  const poolConfig = createPoolConfig(config);
  pool = new Pool(poolConfig);
  
  // Test connection
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    db = drizzle(pool);
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

export function getDatabase(): NodePgDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

export async function withTransaction<T>(
  callback: (tx: NodePgDatabase) => Promise<T>
): Promise<T> {
  const database = getDatabase();
  return await database.transaction(callback);
}

export async function withClient<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const poolInstance = getPool();
  const client = await poolInstance.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}