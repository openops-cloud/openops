const nxPreset = require('@nx/jest/preset').default;

/**
 * Dependencies that are published as ESM only. Jest runs on a CommonJS module
 * registry, so these have to be handed to the transformer instead of being
 * skipped along with the rest of node_modules.
 */
const esmOnlyDependencies = ['lodash-es', 'nanoid'];
const esmOnlyDependencyGroup = esmOnlyDependencies.join('|');
const esmOnlyDependencyPath = `node_modules[/\\\\](?:${esmOnlyDependencyGroup})[/\\\\]`;

module.exports = {
  ...nxPreset,
  /* TODO: Update to latest Jest snapshotFormat
   * By default Nx has kept the older style of Jest Snapshot formats
   * to prevent breaking of any existing tests with snapshots.
   * It's recommend you update to the latest format.
   * You can do this by removing snapshotFormat property
   * and running tests with --update-snapshot flag.
   * Example: "nx affected --targets=test,run-tests --update-snapshot"
   * More info: https://jestjs.io/docs/upgrading-to-jest29#snapshot-format
   */
  snapshotFormat: { escapeString: true, printBasicPrototype: true },
  transformIgnorePatterns: [
    `^(?!.*${esmOnlyDependencyPath}).+\\.js$`,
    `node_modules/(?!(${esmOnlyDependencyGroup})/)`,
  ],
  setupFilesAfterEnv: [__dirname + '/jest.setup.js'],
};
