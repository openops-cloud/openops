# Changelog

## 0.6.3 — 2025-10-30

🚀 New Features
- Displayed query router reasoning in chat (#1541).
- Added Slack configuration to disable link unfurling (#1518).
- Schedule triggers now return start time (#1534).

🐛 Bug Fixes
- Resolved intermittent "no AI configured" message during login/upgrades (#1530).
- Handled invalid tool input in conversation history to prevent API errors (#1500).
- Handled additional error cases in the connections dialog (#1519).
- Fixed workflow builder header overlap on small screens (#1523).
- Fixed text overlap in searchable selects (#1525).
- Fixed text wrapping on condition fields (#1527).
- Ensured proper webhook response when triggered via /sync (#1524).
- Added fallback paste logic when no step is selected (#1515).
- Reverted AI chat connection timeout introduced in #1526; behavior remains unchanged (#1540).

✨ Improvements
- Reduced tool-call hallucinations and added feedback via a void tool (#1505, #1510).
- Marked dynamic properties as required to prevent missing inputs (#1469).
- Updated "Request Integration" button link (#1521).
- Adjusted code block height in AI chat (#1532).
- UI polish: adjusted Mermaid renderer alignment and CodeEditor spacing in connections dialog (#1531, #1520).
- Disabled telemetry when environment variables are not defined (#1512).
- Changed timeout log level from debug to info (#1529).
- Avoided saving trigger polling state when a timeout is reached to preserve data for the next run (#1503).
- Added OpenOps icons (#1537).
- Enhanced prompt guidelines to avoid guesses and fabricated identifiers (#1538).

Full changelog: https://github.com/openops-cloud/openops/compare/0.6.2...0.6.3
