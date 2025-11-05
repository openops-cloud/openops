# 0.6.4

## 🚀 New Features
- AWS SSM runbooks enhancements:
  - Added action to generate a runbook execution link by @rSnapkoOpenOps in https://github.com/openops-cloud/openops/pull/1563
  - Added runbook name, params, and document version fields by @rSnapkoOpenOps in https://github.com/openops-cloud/openops/pull/1560, https://github.com/openops-cloud/openops/pull/1561, https://github.com/openops-cloud/openops/pull/1562
- Added connection property to the HTTP block to support authenticated requests via connections by @bigfluffycookie in https://github.com/openops-cloud/openops/pull/1522

## ✨ Improvements
- Added step index in flow service output to match UI indexing by @alexandrudanpop in https://github.com/openops-cloud/openops/pull/1539
- Separated block filtering logic between template gallery and workflow import connection picker by @cezudas in https://github.com/openops-cloud/openops/pull/1557
- Added descriptions to object definitions in test-run-settings by @bigfluffycookie in https://github.com/openops-cloud/openops/pull/1554
- Query router now only appends tools to avoid duplication by @alexandrudanpop in https://github.com/openops-cloud/openops/pull/1552
- Lowered log severity from error to warn across blocks to reduce non-critical noise by @rSnapkoOpenOps in https://github.com/openops-cloud/openops/pull/1558

## 🐛 Bug Fixes
- Fixed agent stale session by @alexandrudanpop in https://github.com/openops-cloud/openops/pull/1551
- Fixed occasional schema generation errors in Ask AI by @bigfluffycookie in https://github.com/openops-cloud/openops/pull/1553

Full Changelog: https://github.com/openops-cloud/openops/compare/0.6.3...0.6.4
