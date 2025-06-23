const path = require('path');
const fs = require('fs');

/**
 * Get all block directories that contain valid @openops/block-* packages
 * @param {string} baseDir - Base directory path (usually __dirname from the calling webpack config)
 * @param {string} relativePath - Relative path from the base directory to the blocks directory
 * @returns {string[]} Array of absolute paths to block directories
 */
function getBlockDirectories(baseDir, relativePath) {
  const blocksPath = path.resolve(baseDir, relativePath);
  const blockDirs = [];

  function findBlockDirs(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !['node_modules', 'dist', 'framework', 'common'].includes(entry.name)
        ) {
          const fullPath = path.join(dir, entry.name);
          const packageJsonPath = path.join(fullPath, 'package.json');

          try {
            const packageJson = JSON.parse(
              fs.readFileSync(packageJsonPath, 'utf-8'),
            );
            if (packageJson.name?.startsWith('@openops/block-')) {
              blockDirs.push(fullPath);
            } else {
              findBlockDirs(fullPath);
            }
          } catch {
            findBlockDirs(fullPath);
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }

  findBlockDirs(blocksPath);
  return blockDirs;
}

module.exports = {
  getBlockDirectories,
};
