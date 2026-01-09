export default {
  displayName: 'server-api',
  preset: '../../../jest.preset.js',
  setupFiles: ['../../../jest.env.js'],
  setupFilesAfterEnv: ['../../../jest.setup.js'],
  globals: {},
  testEnvironment: 'node',
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
