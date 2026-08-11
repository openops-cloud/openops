import {
  baseConfig,
  serverConfig,
  typeAwareParserOptions,
} from '../../eslint.base.config.mjs';

export default [
  // Replaces packages/engine/.eslintignore, which flat config no longer reads.
  // Patterns are `**/`-prefixed because the Nx eslint executor runs with the
  // workspace root as cwd, and flat-config patterns resolve against cwd. Only
  // engine files are in scope for this run, so these cannot over-match.
  { ignores: ['**/webpack.config.js', '**/test/**'] },
  ...baseConfig,
  ...serverConfig,
  typeAwareParserOptions(import.meta.dirname),
  {
    files: ['**/*.ts', '**/*.js'],
    rules: {
      'no-console': 'off',
    },
  },
];
