import {
  baseConfig,
  typeAwareParserOptions,
} from '../../eslint.base.config.mjs';

export default [...baseConfig, typeAwareParserOptions(import.meta.dirname)];
