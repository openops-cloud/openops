export default {
  displayName: 'blocks-azure',
  preset: '../../../jest.preset.js',
  setupFiles: ['../../../jest.config'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../coverage/packages/blocks/azure',
};
