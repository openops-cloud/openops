# Changelog

## 0.6.4 — 2025-11-05

### 🚀 New Features
- HTTP block: Added a connection property to simplify authenticated requests. ([#1522](https://github.com/openops-cloud/openops/pull/1522))
- AWS SSM Runbooks: Added name, params, and document version fields, plus a "Generate Runbook Link" action. ([#1560](https://github.com/openops-cloud/openops/pull/1560), [#1561](https://github.com/openops-cloud/openops/pull/1561), [#1562](https://github.com/openops-cloud/openops/pull/1562), [#1563](https://github.com/openops-cloud/openops/pull/1563))

### ✨ Improvements
- Flow service output now includes the step index, matching the index shown in the UI. ([#1539](https://github.com/openops-cloud/openops/pull/1539))
- Improved block filtering: Template gallery continues to hide core blocks, while the workflow import connection picker shows only blocks with connections. ([#1557](https://github.com/openops-cloud/openops/pull/1557))
- Reduced log noise by downgrading error logs to warnings across blocks. ([#1558](https://github.com/openops-cloud/openops/pull/1558))

### 🐛 Bug Fixes
- Fixed agent sessions occasionally becoming stale. ([#1551](https://github.com/openops-cloud/openops/pull/1551))
- Fixed Ask AI occasionally throwing schema generation errors. ([#1553](https://github.com/openops-cloud/openops/pull/1553))
- Query router now only appends tools as intended. ([#1552](https://github.com/openops-cloud/openops/pull/1552))
- Fixed SSM Runbook link generation to correctly parse document versions and handle URL fragments. ([#1571](https://github.com/openops-cloud/openops/pull/1571), [#1574](https://github.com/openops-cloud/openops/pull/1574))

Full Changelog: https://github.com/openops-cloud/openops/compare/0.6.3...0.6.4
