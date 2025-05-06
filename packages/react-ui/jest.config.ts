export default {
  displayName: 'react-ui',
  preset: '../../jest.preset.js',
  setupFiles: ['../../jest.env.js', './setup-tests.ts'],
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  transformIgnorePatterns: ['node_modules/(?!(lodash-es)/)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/packages/react-ui',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
