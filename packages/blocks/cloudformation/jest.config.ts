/* eslint-disable */
export default {
  displayName: 'blocks-cloudformation',
  preset: '../../../jest.preset.js',
  setupFiles: ['../../../jest.config'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory:
    '../../../coverage/packages/blocks/cloudformation',
};
