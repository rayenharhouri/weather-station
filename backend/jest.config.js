/**
 * Backend test runner config.
 *
 *   npm test                  # unit tests (default; no DB / network needed)
 *   npm run test:integration  # integration tests (need a live Postgres)
 *
 * Integration specs live under `*.integration.spec.ts` and skip
 * themselves unless `RUN_INTEGRATION_TESTS=1` is set, so the default
 * `jest` run stays fast and dependency-free.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '\\.(spec|test)\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  modulePaths: ['<rootDir>'],
};
