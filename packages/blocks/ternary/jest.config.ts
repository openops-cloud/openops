export default {
  displayName: 'blocks-ternary',
  preset: '../../../jest.preset.js',
  setupFiles: ['../../../jest.env.js'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  transformIgnorePatterns: ['^.+\\.js$'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../coverage/packages/blocks/ternary',
};
