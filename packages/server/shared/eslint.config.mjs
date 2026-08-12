import {
  baseConfig,
  serverConfig,
  typeAwareParserOptions,
} from '../../../eslint.base.config.mjs';

export default [
  { ignores: ['**/*.config.ts'] },
  ...baseConfig,
  ...serverConfig,
  typeAwareParserOptions(import.meta.dirname, [
    'tsconfig.lib.json',
    '../api/tsconfig.app.json',
    '../api/tsconfig.spec.json',
  ]),
  {
    files: ['**/*.test.ts'],
    languageOptions: {
      parserOptions: {
        project: ['tsconfig.spec.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Inert while package.json is ignored in the base config; kept so the intent
    // survives the migration.
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': 'error',
    },
  },
];
