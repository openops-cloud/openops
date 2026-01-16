const nxPreset = require('@nx/jest/preset').default;

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
  transformIgnorePatterns: ['node_modules/(?!(lodash-es)/)'],
  setupFilesAfterEnv: [__dirname + '/jest.setup.js'],
  // Reduce log noise in CI
  silent: process.env.CI === 'true',
  // Optimize test execution
  maxWorkers: process.env.CI === 'true' ? '50%' : '75%',
  // Use minimal reporter in CI for cleaner logs
  reporters: process.env.CI === 'true' 
    ? [['default', { summaryThreshold: 0 }]]
    : ['default'],
};
