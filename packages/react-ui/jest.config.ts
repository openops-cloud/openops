export default {
  displayName: 'react-ui',
  preset: '../../jest.preset.js',
  setupFiles: ['../../jest.env.js', './setup-tests.ts'],
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  transformIgnorePatterns: ['node_modules/(?!(lodash-es|remark-gfm)/)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/packages/react-ui',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@assistant-ui/(.*)$': '<rootDir>/src/__mocks__/assistant-ui/$1',
    '^remark-gfm$': '<rootDir>/src/__mocks__/remark-gfm.ts',
    '^react-resizable-panels$':
      '<rootDir>/src/__mocks__/react-resizable-panels.tsx',
  },
};
