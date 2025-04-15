export default {
  displayName: 'blocks-framework',
  preset: '../../../jest.preset.js',
  setupFiles: ['../../../jest.env.js'],
  globals: {},
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../coverage/packages/blocks/framework',
};
