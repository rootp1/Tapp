import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/examples/', '/webapp/'],
    testMatch: ['**/tests/**/*.spec.ts'],
};

export default config;
