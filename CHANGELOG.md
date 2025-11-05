# Changelog

## 0.6.4 — 2025-11-05

🚀 Features and Improvements
- Added support for connections in the HTTP block.
- Added support for AWS SSM Runbooks.

🐛 Bug Fixes
- Fixed an issue where agent sessions could become stale and unresponsive.
- Resolved intermittent schema generation errors in the Ask AI block.

✨ Improvements
- Updated query router logic to append only relevant tools.
- Changed non-fatal logger.error calls to logger.warn across blocks to improve log severity accuracy.

**[Full Changelog](https://github.com/openops-cloud/openops/compare/0.6.3...0.6.4)**
