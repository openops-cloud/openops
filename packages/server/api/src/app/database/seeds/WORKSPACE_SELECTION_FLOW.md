# Workspace Selection Flow - Complete Explanation

## Overview

This document explains the complete flow of how a workspace gets selected initially and how the `baserow_group_id` cookie gets set.

## Initial Workspace Selection Flow

### 1. **OpenOps Seed Process** (Server-Side)

When OpenOps starts up, it seeds the default workspace:

**File:** `packages/server/api/src/app/database/seeds/seed-admin.ts`

```typescript
// During server startup
await ensureOpenOpsTablesWorkspaceAndDatabaseExist()
  ↓
openopsTables.createDefaultWorkspaceAndDatabase(token)
  ↓
// Creates "OpenOps Workspace" (or uses existing if found)
// Creates "OpenOps Dataset" database in that workspace
```

**Important:** OpenOps only CREATES the workspace/database. It does NOT set any cookies or select the workspace in Baserow. This is purely server-side seeding.

### 2. **User First Visits Baserow** (Client-Side)

When a user first visits Baserow (either directly or via OpenOps iframe), the following happens:

**File:** `web-frontend/modules/core/middleware/workspacesAndApplications.js`

```javascript
// Step 1: Try to read existing cookie
let workspaceId = getWorkspaceCookie(app); // Returns null if no cookie exists

// Step 2: Fetch all workspaces the user has access to
await store.dispatch('workspace/fetchAll');

// Step 3: Check if cookie workspace exists
const workspaces = store.getters['workspace/getAll'];
const workspaceExists =
  workspaces.find((w) => w.id === workspaceId) !== undefined;

if (!workspaceExists) {
  workspaceId = null; // Cookie workspace doesn't exist or no cookie
}

// Step 4: AUTO-SELECT FIRST WORKSPACE if no cookie
if (!workspaceExists && workspaces.length > 0) {
  workspaceId = workspaces[0].id; // ⭐ FIRST WORKSPACE IS AUTO-SELECTED
}

// Step 5: Select the workspace (this sets the cookie)
if (workspaceId) {
  await store.dispatch('workspace/selectById', workspaceId);
}
```

### 3. **Workspace Selection Action** (Sets Cookie)

**File:** `web-frontend/modules/core/store/workspace.js`

```javascript
// Called by middleware: selectById(workspaceId)
async selectById({ dispatch, getters }, id) {
  const workspace = getters.get(id)
  if (!workspace) {
    throw new StoreItemLookupError('workspace', id)
  }
  return dispatch('select', workspace)  // Calls select action
}

// ⭐ THIS IS WHERE THE COOKIE GETS SET
async select({ commit, dispatch }, workspace) {
  await dispatch('fetchPermissions', workspace)
  await dispatch('fetchRoles', workspace)
  commit('SET_SELECTED', workspace)  // Set in Vuex store

  // ⭐ COOKIE SET HERE - Line 379
  setWorkspaceCookie(workspace.id, this.app)  // Sets baserow_group_id cookie

  dispatch('notification/setWorkspace', { workspace }, { root: true })
  return workspace
}
```

**Cookie Setting:**

```javascript
// File: web-frontend/modules/core/utils/workspace.js
export const setWorkspaceCookie = (workspaceId, { $cookies, $config }) => {
  $cookies.set('baserow_group_id', workspaceId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: $config.BASEROW_FRONTEND_SAME_SITE_COOKIE,
    secure: isSecureURL($config.PUBLIC_WEB_FRONTEND_URL),
  });
};
```

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. OpenOps Server Startup (seed-admin.ts)                  │
│    - Creates "OpenOps Workspace"                            │
│    - Creates "OpenOps Dataset" database                     │
│    - Stores workspaceId in organization.tablesWorkspaceId  │
│    ❌ NO COOKIE SET (server-side only)                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. User Visits Baserow (First Time)                         │
│    - Middleware: workspacesAndApplications.js               │
│    - Reads cookie: baserow_group_id → NULL (no cookie yet)  │
│    - Fetches all workspaces user has access to              │
│    - Finds: ["OpenOps Workspace", "Workspace 1", ...]      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Auto-Selection Logic                                      │
│    if (no cookie && workspaces.length > 0) {                │
│      workspaceId = workspaces[0].id  // ⭐ FIRST ONE        │
│    }                                                         │
│    - Usually "OpenOps Workspace" (ID: 1) is first           │
│    - This is the seeded workspace from step 1               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Select Workspace (workspace.js)                          │
│    store.dispatch('workspace/selectById', workspaceId)     │
│      ↓                                                       │
│    - Sets workspace as selected in Vuex store               │
│    - ⭐ SETS COOKIE: baserow_group_id = 1                   │
│    - Loads applications for that workspace                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Subsequent Visits                                         │
│    - Middleware reads cookie: baserow_group_id = 1          │
│    - Selects workspace ID 1 automatically                    │
│    - Cookie persists for 7 days                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Points

1. **OpenOps doesn't set the cookie** - It only creates the workspace on the server side. OpenOps has no control over Baserow cookies.

2. **Baserow middleware sets the cookie** - On first visit, the middleware (`workspacesAndApplications.js`) auto-selects the first workspace from the list.

3. **First workspace is usually the seeded one** - The "OpenOps Workspace" created by the seed script typically:

   - Has the lowest ID (created first)
   - Appears first in `workspaces[0]`
   - Gets auto-selected by the middleware
   - Cookie gets set to this workspace ID

4. **Cookie is set in `select` action** - Line 379 in `workspace.js`:

   ```javascript
   async select({ commit, dispatch }, workspace) {
     commit('SET_SELECTED', workspace)
     setWorkspaceCookie(workspace.id, this.app)  // ⭐ Cookie set here
     // ...
   }
   ```

5. **Cookie persists** - Once set, it's used on subsequent visits (7 day expiry). The middleware reads it and selects that workspace.

6. **User can change workspace** - When user manually selects a different workspace in Baserow UI, the `select` action is called again, updating the cookie.

## When Cookie Gets Updated

The cookie gets updated whenever:

- User manually selects a different workspace in Baserow UI
- `workspace/selectById` action is called (which calls `setWorkspaceCookie`)
- User switches workspace via sidebar dropdown

## OpenOps Integration

When OpenOps passes `workspaceId` via `parentData`:

- Currently, Baserow doesn't use it to set the cookie
- The middleware should be updated to:
  1. Check for `parentData.workspaceId` in query params
  2. If present, use that instead of cookie or first workspace
  3. Set the cookie to that workspace ID

This would ensure that when accessed via OpenOps iframe, the correct workspace (from `organization.tablesWorkspaceId`) is always selected, regardless of what's in the cookie.
