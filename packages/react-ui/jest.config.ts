import baseConfig from '../../jest.config';

/* eslint-disable */
export default {
  ...baseConfig,
  displayName: 'react-ui',
  preset: '../../jest.preset.js',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(lodash-es)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/packages/react-ui',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
