import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MigrationRunner } from '../migrations/migration-runner';

// Mock the database connection
jest.mock('../connection', () => ({
  withClient: jest.fn((callback) => {
    const mockClient = {
      query: jest.fn(() => Promise.resolve({ rows: [] }))
    };
    return callback(mockClient);
  })
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readdir: jest.fn(() => Promise.resolve(['001_test.sql', '002_test.sql'])),
  readFile: jest.fn(() => Promise.resolve(`
-- UP
CREATE TABLE test_table (id SERIAL PRIMARY KEY);

-- DOWN
DROP TABLE test_table;
  `))
}));

describe('MigrationRunner', () => {
  let migrationRunner: MigrationRunner;

  beforeEach(() => {
    migrationRunner = new MigrationRunner();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize migrations table', async () => {
    await migrationRunner.initialize();
    // Test passes if no error is thrown
    expect(true).toBe(true);
  });

  it('should parse migration file correctly', async () => {
    const migrations = await migrationRunner.loadMigrationsFromDirectory('./test-migrations');
    
    expect(migrations).toHaveLength(2);
    expect(migrations[0].id).toBe('001_test');
    expect(migrations[0].up).toContain('CREATE TABLE test_table');
    expect(migrations[0].down).toContain('DROP TABLE test_table');
  });

  it('should check if migration is executed', async () => {
    const isExecuted = await migrationRunner.isMigrationExecuted('001_test');
    expect(typeof isExecuted).toBe('boolean');
  });

  it('should get executed migrations', async () => {
    const executed = await migrationRunner.getExecutedMigrations();
    expect(Array.isArray(executed)).toBe(true);
  });
});