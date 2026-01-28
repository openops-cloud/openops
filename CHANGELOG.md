---
title: "Release notes"
description: "User-facing changes, fixes, and improvements."
icon: "📝"
iconType: "emoji"
---

# Release notes

## 2026-01-27

### 🚀 Improvements

- People can now reliably respond to incoming webhooks without interrupting their automation runs. The engine adds a webhook response hook and a dedicated internal API endpoint so the HTTP `return_response` action can send the webhook response while the flow continues, and successful runs now return `200` with a message instead of `204` with an empty body.
- When you manually run a workflow that uses a scheduled trigger, it now behaves more like a real scheduled run by generating the correct trigger payload. The system executes the scheduled trigger code during manual runs and centralizes manual-run payload resolution with test coverage.
- Email forwarding from Outlook now supports copying additional recipients so messages can be shared with more people in one step. The `forward-email` action adds optional CC and BCC fields and refactors recipient mapping through a shared utility.

### 🐛 Fixes

- Connecting accounts with OAuth is now more robust and less likely to get stuck or lose information during the redirect step. The OAuth flow uses a nonce-based `state`, improves redirect UI, uses `BroadcastChannel` messaging, sends all non-error/non-state query parameters plus `state` back to the opener, and adds safer popup lifecycle handling plus richer server-side OAuth error logging.
- If a workflow is being deleted, it will no longer continue running or report misleading progress updates. The engine uses cache-based deletion signaling and guards execution so deletion requests stop runs, skip run updates, and treat workflow-deletion errors as stopped runs.

### ✨ Quality of life

- The AI chat panel takes up less space on screen when opened, making more room for your content. The visible minimum width was reduced from 388px to 300px.
- The Outlook email search help text is easier to follow, reducing trial-and-error when building queries. The `find-email` action clarifies the `searchQuery` description by reformatting the example search terms.
