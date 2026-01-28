---
title: "Release notes"
description: "User-facing changes, fixes, and improvements."
icon: "📝"
iconType: "emoji"
---

# Release notes

## 2026-01-27

### 🚀 Improvements

- People can now reliably respond to incoming webhooks without interrupting their automation runs.
- When you manually run a workflow that uses a scheduled trigger, it now behaves more like a real scheduled run by generating the correct trigger payload.
- Email forwarding from Outlook now supports copying additional recipients so messages can be shared with more people in one step.

### 🐛 Fixes

- Connecting accounts with OAuth is now more robust and less likely to get stuck or lose information during the redirect step.
- If a workflow is being deleted, it will no longer continue running or report misleading progress updates.

### ✨ Quality of life

- The AI chat panel takes up less space on screen when opened, making more room for your content.
- The Outlook email search help text is easier to follow, reducing trial-and-error when building queries.
