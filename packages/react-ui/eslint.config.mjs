import { baseConfig, frontendConfig } from '../../eslint.base.config.mjs';

export default [
  ...baseConfig,
  ...frontendConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'react/prop-types': 'error',
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/app/features',
              from: ['./src/app/routes'],
            },
            {
              target: './src/app/common',
              from: ['./src/app/features', './src/app/routes'],
            },
            {
              target: './src/app/constants',
              from: ['./src/app/features', './src/app/common'],
            },
            {
              target: './src/app/lib',
              from: [
                './src/app/features',
                './src/app/routes',
                './src/app/common',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'react/prop-types': 'off',
    },
  },
];
