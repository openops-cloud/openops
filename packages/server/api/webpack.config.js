const { composePlugins, withNx } = require('@nx/webpack');
const IgnoreDynamicRequire = require('webpack-ignore-dynamic-require');
const path = require('path');
const { getBlockDirectories } = require('../../../tools/webpack-utils');

module.exports = composePlugins(withNx(), (config) => {
  config.plugins.push(new IgnoreDynamicRequire());

  // Enhanced webpack plugin for smarter block watching (development only)
  config.plugins.push({
    apply: (compiler) => {
      let isInitialBuild = true;
      const changedBlocks = new Set();

      // Watch individual block directories instead of the entire blocks folder
      compiler.hooks.afterCompile.tap('SmartBlockWatcher', (compilation) => {
        const blockDirs = getBlockDirectories(__dirname, '../../blocks');
        blockDirs.forEach((dir) => {
          compilation.contextDependencies.add(dir);
        });
      });

      // Handle file changes more intelligently
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
          }
        },
      );

      // Simple build coordination - just log changes, let external tools handle builds
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
