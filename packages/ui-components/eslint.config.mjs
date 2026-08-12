import storybook from 'eslint-plugin-storybook';
import { baseConfig, frontendConfig } from '../../eslint.base.config.mjs';

export default [
  { ignores: ['**/storybook-static/**'] },
  ...baseConfig,
  ...frontendConfig,
  ...storybook.configs['flat/recommended'],
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-console': 'error',
      'react/prop-types': 'off',
      'testing-library/prefer-screen-queries': 'off',
    },
  },
];
