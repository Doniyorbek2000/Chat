import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.(t|j)s',
    '!**/*.dto.(t|j)s',
    '!**/*.entity.(t|j)s',
    '!**/*.interface.(t|j)s',
    '!**/main.(t|j)s',
    '!**/index.(t|j)s',
    '!**/__mocks__/**',
    '!**/migrations/**',
    '!**/seeds/**',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThresholds: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^src/(.*)$': '<rootDir>/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/../tsconfig.json',
    },
  },
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 30000,
};

export default config;
