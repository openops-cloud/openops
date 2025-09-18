# Outlook Block

This block provides integration with Microsoft Outlook/Office 365 email.

## Features

- **New Email Trigger**: Triggers when new emails are received with optional filtering
- Filters by sender, recipients, CC, and subject line
- Test functionality to fetch latest emails

## Authentication

Uses OAuth2 with minimal permissions to avoid admin approval requirements:

- `Mail.Read`: Read user's mail
- `offline_access`: Maintain access to data
- `User.Read`: Read basic user profile

## Triggers

### New Email

Monitors for new emails in the user's mailbox with configurable filters.
