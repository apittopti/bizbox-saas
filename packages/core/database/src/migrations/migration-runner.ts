import { PoolClient } from 'pg';
import { withClient } from '../connection';
import path from 'path';
import fs from 'fs/promises';

export interface Migration {
  id: string;
  name: string;
  plugin?: string;
  up: string;
  down: string;
  createdAt: Date;
}

export interface MigrationRecord {
  id: string;
  name: string;
  plugin: string | null;
  executed_at: Date;
  checksum: string;
}

export class MigrationRunner {
  private migrationsTable = 'schema_migrations';

  async initialize(): Promise<void> {
    await withClient(async (client) => {
      // Create migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          plugin VARCHAR(255),
          executed_at TIMESTAMP DEFAULT NOW(),
          checksum VARCHAR(64) NOT NULL
        );
      `);

      // Create index on plugin for faster queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_plugin 
        ON ${this.migrationsTable} (plugin);
      `);
    });
  }

  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    return await withClient(async (client) => {
      const result = await client.query(`
        SELECT id, name, plugin, executed_at, checksum 
        FROM ${this.migrationsTable} 
        ORDER BY executed_at ASC
      `);
      return result.rows;
    });
  }

  async isMigrationExecuted(migrationId: string): Promise<boolean> {
    return await withClient(async (client) => {
      const result = await client.query(
        `SELECT 1 FROM ${this.migrationsTable} WHERE id = $1`,
        [migrationId]
      );
      return result.rows.length > 0;
    });
  }

  async executeMigration(migration: Migration): Promise<void> {
    await withClient(async (client) => {
      await client.query('BEGIN');
      
      try {
        // Execute the migration SQL
        await client.query(migration.up);
        
        // Record the migration
        const checksum = await this.calculateChecksum(migration.up);
        await client.query(
          `INSERT INTO ${this.migrationsTable} (id, name, plugin, checksum) 
           VALUES ($1, $2, $3, $4)`,
          [migration.id, migration.name, migration.plugin || null, checksum]
        );
        
        await client.query('COMMIT');
        console.log(`Migration executed: ${migration.name}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Migration failed: ${migration.name}`, error);
        throw error;
      }
    });
  }

  async rollbackMigration(migration: Migration): Promise<void> {
    await withClient(async (client) => {
      await client.query('BEGIN');
      
      try {
        // Execute the rollback SQL
        await client.query(migration.down);
        
        // Remove the migration record
        await client.query(
          `DELETE FROM ${this.migrationsTable} WHERE id = $1`,
          [migration.id]
        );
        
        await client.query('COMMIT');
        console.log(`Migration rolled back: ${migration.name}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Migration rollback failed: ${migration.name}`, error);
        throw error;
      }
    });
  }

  async loadMigrationsFromDirectory(directory: string, plugin?: string): Promise<Migration[]> {
    const migrations: Migration[] = [];
    
    try {
      const files = await fs.readdir(directory);
      const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
      
      for (const file of sqlFiles) {
        const filePath = path.join(directory, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Parse migration file (expecting -- UP and -- DOWN sections)
        const sections = this.parseMigrationFile(content);
        const migrationId = path.basename(file, '.sql');
        
        migrations.push({
          id: migrationId,
          name: file,
          plugin,
          up: sections.up,
          down: sections.down,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.warn(`Could not load migrations from ${directory}:`, error);
    }
    
    return migrations;
  }

  private parseMigrationFile(content: string): { up: string; down: string } {
    const lines = content.split('\n');
    let currentSection: 'up' | 'down' | null = null;
    const sections = { up: '', down: '' };
    
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      
      if (trimmed === '-- up' || trimmed === '-- +migrate up') {
        currentSection = 'up';
        continue;
      } else if (trimmed === '-- down' || trimmed === '-- +migrate down') {
        currentSection = 'down';
        continue;
      }
      
      if (currentSection && !line.trim().startsWith('--')) {
        sections[currentSection] += line + '\n';
      }
    }
    
    return sections;
  }

  private async calculateChecksum(content: string): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async runPendingMigrations(migrationsDir: string, plugin?: string): Promise<void> {
    await this.initialize();
    
    const migrations = await this.loadMigrationsFromDirectory(migrationsDir, plugin);
    const executedMigrations = await this.getExecutedMigrations();
    const executedIds = new Set(executedMigrations.map(m => m.id));
    
    const pendingMigrations = migrations.filter(m => !executedIds.has(m.id));
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }
    
    console.log(`Running ${pendingMigrations.length} pending migrations...`);
    
    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }
    
    console.log('All migrations completed successfully');
  }
}