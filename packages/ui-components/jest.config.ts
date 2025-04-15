export default {
  displayName: 'ui-components',
  preset: '../../jest.preset.js',
  setupFiles: ['../../jest.env.js'],
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/packages/ui-components',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
