const { composePlugins, withNx } = require('@nx/webpack');
const IgnoreDynamicRequire = require('webpack-ignore-dynamic-require');
const path = require('path');
const { getBlockDirectories } = require('../../../tools/webpack-utils');

module.exports = composePlugins(withNx(), (config) => {
  config.plugins.push(new IgnoreDynamicRequire());

  config.plugins.push({
    apply: (compiler) => {
      let isInitialBuild = true;
      const changedBlocks = new Set();

      compiler.hooks.afterCompile.tap('SmartBlockWatcher', (compilation) => {
        const blockDirs = getBlockDirectories(__dirname, '../../blocks');
        blockDirs.forEach((dir) => {
          compilation.contextDependencies.add(dir);
        });

        const openopsDir = path.resolve(__dirname, '../../openops');
        compilation.contextDependencies.add(openopsDir);
      });

      compiler.hooks.invalid.tap(
        'SmartBlockWatcher',
        (filename, changeTime) => {
          if (filename && filename.includes('/packages/blocks/')) {
            const relativePath = path.relative(
              path.resolve(__dirname, '../..'),
              filename,
            );
            const pathParts = relativePath.split('/');

            if (
              pathParts[0] === 'packages' &&
              pathParts[1] === 'blocks' &&
              pathParts[2]
            ) {
              changedBlocks.add(pathParts[2]);
              console.log(
                `[API Server] Detected change in block: ${pathParts[2]}`,
              );
            }
          } else if (filename && filename.includes('/packages/openops/')) {
            console.log(
              `[API Server] Detected change in openops package: ${filename}`,
            );
          }
        },
      );

      compiler.hooks.beforeCompile.tapAsync(
        'SmartBlockWatcher',
        (params, callback) => {
          if (isInitialBuild) {
            isInitialBuild = false;
          }

          if (changedBlocks.size > 0) {
            console.log(
              `[API Server] Changes detected in blocks: ${Array.from(
                changedBlocks,
              ).join(', ')} - please rebuild manually if needed`,
            );
            changedBlocks.clear();
          }

          callback();
        },
      );
    },
  });

  return config;
});
