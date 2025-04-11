import baseConfig from '../../../jest.config';

/* eslint-disable */
export default {
  ...baseConfig,
  displayName: 'blocks-cloudformation',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory:
    '../../../coverage/packages/blocks/cloudformation',
};
