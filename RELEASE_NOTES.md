---
title: "Release notes"
description: "Summary of notable changes for each OpenOps release."
icon: "🚀"
iconType: "emoji"
slug: "/release-notes"
---

This page lists user-facing changes for each OpenOps release.

## 🚀

- Released version 0.6.11 with security‑hardened IaC parsing, more reliable file uploads, and clearer error handling for email‑based user lookups.

## 🐛

- Fixed file upload failures so files are reliably accepted and processed.

## ✨

- Prevented remote code execution when processing Terraform and CloudFormation blocks by hardening infrastructure‑as‑code parsing against malicious input.
- Improved error handling when looking up users by email to return clearer feedback instead of generic failures.


