export default {
  displayName: 'ui-kit',
  preset: '../../../jest.preset.js',
  setupFiles: ['../../../jest.env.js', './setup-tests.ts'],
  transformIgnorePatterns: ['node_modules/(?!(lodash-es|remark-gfm)/)'],
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../../coverage/packages/ee/ui-kit',
  moduleNameMapper: {
    '^@assistant-ui/(.*)$': '<rootDir>/src/__mocks__/assistant-ui/$1',
    '^remark-gfm$': '<rootDir>/src/__mocks__/remark-gfm.ts',
  },
};
