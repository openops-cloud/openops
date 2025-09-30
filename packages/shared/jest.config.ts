export default {
  displayName: 'shared',
  preset: '../../jest.preset.js',
  setupFiles: ['../../jest.env.js'],
  globals: {},
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.spec.json' },
    ],
  },
  transformIgnorePatterns: ['/node_modules/', '^.+\\.js$'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/shared',
};
