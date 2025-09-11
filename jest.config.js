/**
 * Root Jest configuration for BizBox Multi-Tenant SaaS Platform
 * Provides shared testing configuration across all packages
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Project structure for monorepo
  projects: [
    '<rootDir>/packages/core/*/jest.config.js',
    '<rootDir>/packages/plugins/*/jest.config.js',
    '<rootDir>/packages/shared/*/jest.config.js',
    '<rootDir>/packages/tools/*/jest.config.js',
    '<rootDir>/tests/jest.config.js'
  ],

  // Global coverage settings
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/config/global-setup.ts',
  globalTeardown: '<rootDir>/tests/config/global-teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/tests/config/jest-setup.ts'],

  // Module resolution
  moduleNameMapping: {
    '^@bizbox/(.*)$': '<rootDir>/packages/$1/src',
    '^@test/(.*)$': '<rootDir>/tests/$1'
  },

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/*.test.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],

  // Coverage collection patterns
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/__tests__/**',
    '!packages/*/src/types/**'
  ],

  // Transform patterns
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json'
    }]
  },

  // Timeout for long-running tests
  testTimeout: 30000,

  // Verbose output for CI
  verbose: process.env.CI === 'true'
};