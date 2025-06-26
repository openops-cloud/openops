const { composePlugins, withNx } = require('@nx/webpack');
const IgnoreDynamicRequire = require('webpack-ignore-dynamic-require');
const path = require('path');
const { getBlockDirectories } = require('../../tools/webpack-utils');
const chalk = require('chalk');

module.exports = composePlugins(withNx(), (config) => {
  config.plugins.push(new IgnoreDynamicRequire());

  config.plugins.push({
    apply: (compiler) => {
      let isInitialBuild = true;

      compiler.hooks.afterCompile.tap('SmartBlockWatcher', (compilation) => {
        const blockDirs = getBlockDirectories(__dirname, '../blocks');
        blockDirs.forEach((dir) => {
          compilation.contextDependencies.add(dir);
        });

        const openopsDir = path.resolve(__dirname, '../openops');
        compilation.contextDependencies.add(openopsDir);

        const sharedDir = path.resolve(__dirname, '../shared');
        compilation.contextDependencies.add(sharedDir);

        const serverSharedDir = path.resolve(__dirname, '../server/shared');
        compilation.contextDependencies.add(serverSharedDir);
      });

      compiler.hooks.invalid.tap('SmartBlockWatcher', (filename) => {
        const relativePath = path.relative(
          path.resolve(__dirname, '..'),
          filename,
        );

        console.log(
          chalk.yellow(`[Engine Server] Detected change in: ${relativePath}`),
        );
      });

      compiler.hooks.beforeCompile.tapAsync(
        'SmartBlockWatcher',
        (params, callback) => {
          if (isInitialBuild) {
            isInitialBuild = false;
          }
          callback();
        },
      );
    },
  });

  return config;
});
