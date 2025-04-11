import baseConfig from '../../jest.config';

/* eslint-disable */
export default {
  ...baseConfig,
  displayName: '@openops/common',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/openops/',
};
