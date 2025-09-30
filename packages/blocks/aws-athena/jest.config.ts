export default {
  displayName: 'blocks-aws-athena',
  preset: '../../../jest.preset.js',
  setupFiles: ['../../../jest.env.js'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.spec.json' },
    ],
  },
  transformIgnorePatterns: ['/node_modules/', '^.+\\.js$'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../coverage/packages/blocks/aws-athena',
};
