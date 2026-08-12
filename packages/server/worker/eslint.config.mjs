import {
  baseConfig,
  serverConfig,
  typeAwareParserOptions,
} from '../../../eslint.base.config.mjs';

export default [
  ...baseConfig,
  ...serverConfig,
  typeAwareParserOptions(import.meta.dirname),
  {
    // Inert while package.json is ignored in the base config; kept so the intent
    // survives the migration.
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': 'error',
    },
  },
];
