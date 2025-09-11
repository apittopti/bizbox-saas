/**
 * Jest configuration for integration and system tests
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'Integration Tests',

  // Test file patterns for integration tests
  testMatch: [
    '<rootDir>/integration/**/*.test.ts',
    '<rootDir>/integration/**/*.spec.ts'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/config/jest-setup.ts'],

  // Module resolution
  moduleNameMapping: {
    '^@bizbox/(.*)$': '<rootDir>/../packages/$1/src',
    '^@test/(.*)$': '<rootDir>',
    '^@fixtures/(.*)$': '<rootDir>/fixtures/$1'
  },

  // Coverage settings for integration tests
  collectCoverageFrom: [
    '../packages/*/src/**/*.ts',
    '!../packages/*/src/**/*.d.ts',
    '!../packages/*/src/__tests__/**'
  ],

  // Transform settings
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/../tsconfig.json'
    }]
  },

  // Longer timeout for integration tests
  testTimeout: 60000,

  // Run tests serially to avoid database conflicts
  maxWorkers: 1,

  // Environment variables for testing
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};