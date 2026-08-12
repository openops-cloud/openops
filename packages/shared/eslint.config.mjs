import {
  baseConfig,
  serverConfig,
  typeAwareParserOptions,
} from '../../eslint.base.config.mjs';

export default [
  ...baseConfig,
  ...serverConfig,
  typeAwareParserOptions(import.meta.dirname),
];
