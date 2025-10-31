# Changelog

All notable changes to this project will be documented in this file.

## 0.6.3 — 2025-10-30

🚀 New
- Added Slack configuration to disable link unfurling. (#1518)
- Displayed query router reasoning in chat to increase transparency. (#1541)
- Schedule triggers now return start time for better observability. (#1534)

🐛 Bug Fixes
- Handled invalid tool input in conversation history to prevent API errors. (#1500)
- Addressed additional error cases in the connections dialog. (#1519)
- Fixed workflow builder header overlap on small screens. (#1523)
- Ensured proper webhook response when triggered via /sync. (#1524)
- Resolved intermittent "no AI configured" message during login/upgrades. (#1530)
- Fixed Searchable Select text overlap. (#1525)
- Fixed text wrapping on condition fields. (#1527)
- Prevented saving trigger polling state when a timeout is reached. (#1503)

✨ Improvements
- Forced dynamic properties to be required to avoid missing inputs in workflows. (#1469)
- Greatly reduced the chance of tool hallucinations. (#1505)
- Added a void tool to return feedback on hallucinated tool calls. (#1510)
- Included user_facing_reasoning when repairing malformed JSON in AI-SDK generateObject. (#1544)
- Adjusted code block height inside AI chat. (#1532)
- Adjusted CodeEditor container height and save button margin in the connections dialog. (#1520)
- Adjusted alignment in MermaidRenderer container. (#1531)
- Implemented fallback paste logic when no step is selected. (#1515)
- Updated "Request Integration" button link. (#1521)
- Disabled telemetry when environment variables are not defined. (#1512)
- Added OpenOps icons. (#1537)

Full Changelog: https://github.com/openops-cloud/openops/compare/0.6.2...0.6.3
