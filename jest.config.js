module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
  collectCoverageFrom: [
    'lib/liquidity/**/*.ts',
    '!lib/liquidity/**/*.test.ts',
    '!lib/liquidity/**/*.spec.ts',
    '!lib/liquidity/types.ts',
    '!lib/liquidity/index.ts',
  ],
  coverageThreshold: {
    'lib/liquidity/**/*.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
