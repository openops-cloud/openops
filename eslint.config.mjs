import baseConfig from './eslint.base.config.mjs';

/**
 * Root config. Projects without their own `eslint.config.mjs` resolve to this
 * one, since both the Nx eslint executor and ESLint itself search upwards from
 * the project directory.
 */
export default baseConfig;
