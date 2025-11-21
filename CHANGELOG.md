# 0.6.7

## 🚀 Features and Improvements
- Added support for Gemini 3 Pro and GPT 5.1 AI models (#1636)
- Allowed disabling internal host validation in SMTP and HTTP blocks via the ENABLE_HOST_VALIDATION environment variable (#1637)

## 🐛 Bug Fixes
- Fixed Slack block "Request Action" not working when button text contained an emoji normalized by Slack (#1600)
- Fixed AI chat history to filter out conversations triggered from specific steps (#1622)
- Fixed JSON stringify exceptions in the logger (#1635)
- Fixed display of workflow runs in the UI when the run failed due to trigger failure (#1577)

**Full Changelog:** https://github.com/openops-cloud/openops/compare/0.6.6...0.6.7
