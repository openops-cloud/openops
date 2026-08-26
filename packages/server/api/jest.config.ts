export default {
  displayName: 'server-api',
  preset: '../../../jest.preset.js',
  setupFiles: ['../../../jest.env.js'],
  globals: {},
  testEnvironment: 'node',
  // Jest never releases a test file's vm context, so every integration test
  // file permanently retains the server module graph it loaded (~60 MB each).
  // Recycling the worker before it reaches the runner's ~2 GB heap cap is the
  // only way to keep the suite inside it.
  workerIdleMemoryLimit: '1250MB',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html', 'json'],
  coverageDirectory: '../../../coverage/packages/server/api',
};
