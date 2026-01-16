export default {
  displayName: 'blocks-slack',
  preset: '../../../jest.preset.js',
  setupFiles: ['../../../jest.env.js'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  transformIgnorePatterns: ['^.+\\.js$'],
  moduleFileExtensions: ['ts', 'js', 'html', 'json'],
  coverageDirectory: '../../../coverage/packages/blocks/slack',
};
