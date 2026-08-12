import { baseConfig, frontendConfig } from '../../eslint.base.config.mjs';

export default [
  ...baseConfig,
  ...frontendConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-console': 'error',
      'react/prop-types': 'off',
      'testing-library/prefer-screen-queries': 'off',
      '@nx/enforce-module-boundaries': 'off',
    },
  },
];
