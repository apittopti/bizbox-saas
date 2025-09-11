module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  moduleNameMapping: {
    '^@bizbox/core/(.*)$': '<rootDir>/../../core/$1/src',
    '^@bizbox/shared/(.*)$': '<rootDir>/../../shared/$1/src',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
};