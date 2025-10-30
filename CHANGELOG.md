# Changelog

## 0.6.3

### 🚀 Features and Improvements
- Added an option to disable link unfurling when sending Slack messages.
- Displayed AI reasoning in chat for improved transparency.
- Updated schedule triggers to return start times, removing the need to use the “Get Current Date” step.
- Updated block icons.
- Added a “Request Integration” button link when searching for blocks.
- Updated OpenOps tables to [Baserow 1.35.3](https://gitlab.com/baserow/baserow/-/releases/1.35.3).

### 🐛 Bug Fixes
- Fixed webhook responses when triggered via `/sync`.
- Resolved "no AI configured" message during login and upgrades.
- Handled invalid tool inputs and additional error cases in conversation history and connection dialogs.
- Adjusted MermaidRenderer alignment and AI chat code height.

### 🔧 Maintenance
- Enforced dynamic properties to be mandatory for stricter schema validation.

[Full Changelog](https://github.com/openops-cloud/openops/compare/0.6.2...0.6.3)
