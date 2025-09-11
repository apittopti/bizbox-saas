#!/usr/bin/env node

import { Command } from 'commander';
import { initializeDatabase, closeDatabase } from './connection';
import { MigrationRunner } from './migrations/migration-runner';
import path from 'path';

const program = new Command();

program
  .name('bizbox-db')
  .description('BizBox Database CLI')
  .version('1.0.0');

program
  .command('migrate')
  .description('Run pending migrations')
  .option('-d, --dir <directory>', 'Migrations directory', './migrations')
  .option('-p, --plugin <plugin>', 'Plugin name for plugin-specific migrations')
  .action(async (options) => {
    try {
      await initializeDatabase();
      const runner = new MigrationRunner();
      const migrationsDir = path.resolve(options.dir);
      
      console.log(`Running migrations from: ${migrationsDir}`);
      if (options.plugin) {
        console.log(`Plugin: ${options.plugin}`);
      }
      
      await runner.runPendingMigrations(migrationsDir, options.plugin);
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    } finally {
      await closeDatabase();
    }
  });

program
  .command('migrate:status')
  .description('Show migration status')
  .action(async () => {
    try {
      await initializeDatabase();
      const runner = new MigrationRunner();
      await runner.initialize();
      
      const executed = await runner.getExecutedMigrations();
      
      console.log('\nExecuted migrations:');
      console.log('ID\t\t\tName\t\t\tPlugin\t\tExecuted At');
      console.log('-'.repeat(80));
      
      for (const migration of executed) {
        console.log(
          `${migration.id}\t${migration.name}\t${migration.plugin || 'core'}\t${migration.executed_at}`
        );
      }
      
      console.log(`\nTotal: ${executed.length} migrations executed`);
    } catch (error) {
      console.error('Failed to get migration status:', error);
      process.exit(1);
    } finally {
      await closeDatabase();
    }
  });

program
  .command('init')
  .description('Initialize database connection')
  .action(async () => {
    try {
      await initializeDatabase();
      console.log('Database connection initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    } finally {
      await closeDatabase();
    }
  });

if (require.main === module) {
  program.parse();
}

export { program };