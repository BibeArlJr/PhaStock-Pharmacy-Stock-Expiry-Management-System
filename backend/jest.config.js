export default {
  testEnvironment: 'node',
  verbose: true,
  transform: {},
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setupTestDb.js'],
  testMatch: ['**/tests/**/*.test.js'],
};
