import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'jsdom',
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
          jsx: 'react-jsx',
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      testMatch: [
        '<rootDir>/src/lib/__tests__/**/*.test.ts',
      ],
      transformIgnorePatterns: [
        '/node_modules/(?!firebase|@firebase)',
      ],
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      testMatch: [
        '<rootDir>/src/app/api/__tests__/**/*.test.ts',
      ],
      testTimeout: 15000,
      transformIgnorePatterns: [
        '/node_modules/',
      ],
    },
  ],
};

export default config;
