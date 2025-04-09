const { composePlugins, withNx } = require('@nx/webpack');
const IgnoreDynamicRequire = require('webpack-ignore-dynamic-require');
const path = require('path');

module.exports = composePlugins(withNx(), (config) => {
  config.plugins.push(new IgnoreDynamicRequire());

  config.plugins.push({
    apply: (compiler) => {
      compiler.hooks.afterCompile.tap('WatchBlocksFolder', (compilation) => {
        compilation.contextDependencies.add(
          path.resolve(__dirname, '../blocks')
        );
      });
    }
  });

  return config;
});
