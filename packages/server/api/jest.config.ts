export default {
  displayName: 'server-api',
  preset: '../../../jest.preset.js',
  setupFiles: ['../../../jest.env.js'],
  globals: {},
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            decorators: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html', 'json'],
  coverageDirectory: '../../../coverage/packages/server/api',
};
