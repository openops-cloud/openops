/* eslint-disable */
export default {
  displayName: 'engine',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  transformIgnorePatterns: ["node_modules/(?!string\-replace\-async)"],
  moduleNameMapper: {
    "lodash-es": "lodash"
  },
  moduleFileExtensions: ['ts', 'js', 'html', 'node'],
  coverageDirectory: '../../coverage/packages/engine',
};
