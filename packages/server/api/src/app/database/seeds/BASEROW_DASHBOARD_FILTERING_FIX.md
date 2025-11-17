# Baserow Dashboard Filtering Fix

## Overview

This document describes the fix needed for Phase 4: Tables Iframe Query Parameter Filtering.

## Problem

In Baserow UI, the sidebar already shows the correct workspace, but the dashboard view "all tables" is missing a filter that the sidebar has. The workspace information already exists in the iframe context via `parentData`.

## Solution

The workspace ID is now being passed to the Baserow iframe via the `parentData` query parameter in the OpenOps Tables page component. The Baserow web-frontend needs to:

1. Extract the `workspaceId` from the `parentData` parameter
2. Apply the same workspace filter to the dashboard view "all tables" that the sidebar uses

## Code Locations in Baserow Repository

The following files in the Baserow repository need to be modified:

- `web-frontend/modules/core/pages/dashboard.vue` - Dashboard view component
- `web-frontend/modules/core/middleware/workspacesAndApplications.js` - Workspace filtering logic
- Sidebar components - Reference implementation for correct filtering

## Implementation Steps

1. **Extract workspace ID from parentData:**

   - Parse the `parentData` query parameter (already being passed from OpenOps)
   - Extract the `workspaceId` field from the parsed JSON

2. **Apply workspace filter to dashboard view:**

   - Compare the sidebar filtering implementation with the dashboard view
   - Add the missing workspace filter to the dashboard view "all tables"
   - Ensure the dashboard view respects the same workspace context as the sidebar

3. **Testing:**
   - Verify that the dashboard view "all tables" shows only tables from the correct workspace
   - Verify that the filter matches what the sidebar displays
   - Test with multiple workspaces to ensure proper filtering

## OpenOps Changes

The following changes have been made in OpenOps to support this fix:

1. **Updated `packages/react-ui/src/app/routes/openops-tables/index.tsx`:**

   - Added `workspaceId` to the `parentData` object passed to the iframe
   - The workspace ID comes from the organization's `tablesWorkspaceId` field

2. **Workspace ID Source:**
   - The workspace ID is retrieved from the current organization via `platformHooks.useCurrentPlatform()`
   - This ensures the correct workspace is always passed to the Baserow iframe

## Notes

- No query parameters are needed beyond the existing `parentData` parameter
- The information already exists in the iframe context
- This is a bug fix in Baserow UI, independent of other phases
