---
title: "Release notes"
description: "User-facing changes for each OpenOps release, organized by feature, fixes, and enhancements."
icon: "🚀"
iconType: "emoji"
slug: "/release-notes"
---

This page lists user-facing changes for each OpenOps release.

## 🚀 New

- Released version 0.6.11 with security‑hardened IaC parsing.

## 🐛 Fixes

- Fixed file upload failures so files are reliably accepted and processed.

## ✨ Enhancements

- Prevented remote code execution when processing Terraform and CloudFormation blocks by hardening infrastructure‑as‑code parsing against malicious input.
- Improved error handling when looking up users by email to return clearer feedback instead of generic failures.

