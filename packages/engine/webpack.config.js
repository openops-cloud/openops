const { composePlugins, withNx } = require('@nx/webpack');
const IgnoreDynamicRequire = require('webpack-ignore-dynamic-require');
const path = require('path');
const { getBlockDirectories } = require('../../tools/webpack-utils');

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
      });

      compiler.hooks.invalid.tap('SmartBlockWatcher', (filename) => {
        if (filename && filename.includes('/packages/blocks/')) {
          const relativePath = path.relative(
            path.resolve(__dirname, '..'),
            filename,
          );
          const pathParts = relativePath.split('/');

          if (
            pathParts[0] === 'packages' &&
            pathParts[1] === 'blocks' &&
            pathParts[2]
          ) {
            console.log(
              `[Engine Server] Detected change in block: ${pathParts[2]} - waiting for API server to handle build`,
            );
          }
        }
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
