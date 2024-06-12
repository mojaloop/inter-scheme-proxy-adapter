module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  clearMocks: true,
  collectCoverage: true,
  moduleNameMapper: {
    '^#src/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['./test/setup.ts'],
};
