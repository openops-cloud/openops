/**
 * Custom ESLint plugin for OpenOps block style guide enforcement
 */

module.exports = {
  rules: {
    'block-style-guide': require('./rules/block-style-guide'),
  },
};
