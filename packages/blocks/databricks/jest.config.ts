export default {
  displayName: 'blocks-databricks',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  transformIgnorePatterns: ['^.+\\.js$'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../coverage/packages/blocks/databricks',
};
