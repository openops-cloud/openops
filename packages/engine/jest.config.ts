export default {
  displayName: 'engine',
  preset: '../../jest.preset.js',
  setupFiles: ['../../jest.env.js'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  transformIgnorePatterns: [
    '^.+\\.js$',
    'node_modules/(?!string-replace-async)',
  ],
  moduleNameMapper: {
    'lodash-es': 'lodash',
  },
  moduleFileExtensions: ['ts', 'js', 'html', 'node'],
  coverageDirectory: '../../coverage/packages/engine',
};
