# Workspace Access Investigation

## Problem

When accessing the Baserow dashboard directly at `http://localhost:3001/openops-tables/dashboard`, only the initially seeded `OPENOPS_DEFAULT_DATABASE_NAME` is visible, not the additional workspaces/databases created by the one-off script.

## Root Cause

The issue is related to **user workspace access permissions**:

1. **Workspace Creation**: The one-off script creates workspaces using the admin user's token (`authenticateDefaultUserInOpenOpsTables()`)
2. **Dashboard Access**: When accessing the Baserow dashboard directly, you're authenticated as a **different user** (not the admin)
3. **Baserow Filtering**: Baserow's `workspace/fetchAll` API only returns workspaces the **authenticated user** has access to
4. **Result**: The newly created workspaces are not visible because the current user doesn't have access to them

## How Baserow Workspace Access Works

- When a workspace is created, the creator automatically gets access
- Other users need to be explicitly added to workspaces to see them
- The Baserow API endpoint `api/workspaces/` returns only workspaces the authenticated user can access

## Solutions

### Option 1: Access Dashboard as Admin User (Quick Fix)

Ensure you're logged into Baserow as the admin user (the one specified in `OPENOPS_ADMIN_EMAIL`). This user created the workspaces and has automatic access.

**To verify:**
- Check which user you're logged in as in Baserow
- Log out and log in with the admin email/password

### Option 2: Add Users to Workspaces (Recommended for Production)

Update the one-off script to add all users (or specific users) to the newly created workspaces. This ensures all users can see the workspaces.

**Implementation:**
- After creating each workspace, iterate through users
- Add each user to the workspace using `openopsTables.addUserToWorkspace()`

### Option 3: Use Organization's Workspace (For OpenOps Integration)

When accessing through OpenOps iframe, the workspace ID is passed via `parentData`. The dashboard should filter by this workspace ID. This is the Phase 4 fix that needs to be implemented in Baserow.

## Code Flow

1. **One-off Script** (`create-additional-workspaces-databases-one-off.ts`):
   - Uses admin token to create workspaces
   - Admin user automatically has access

2. **Baserow Dashboard** (`web-frontend/modules/core/pages/dashboard.vue`):
   - Calls `store.dispatch('workspace/fetchAll')`
   - This fetches workspaces for the **currently authenticated user**
   - Only returns workspaces the user has access to

3. **Middleware** (`web-frontend/modules/core/middleware/workspacesAndApplications.js`):
   - Loads workspaces on page load
   - Filters by authenticated user's access

## Verification Steps

1. **Check current user in Baserow:**
   - Open browser dev tools
   - Check the authentication state/cookies
   - Verify which user is logged in

2. **Check workspace creation:**
   - Verify the one-off script ran successfully
   - Check logs for workspace IDs created
   - Verify workspaces exist in Baserow database

3. **Check user access:**
   - Use Baserow API to list workspaces for the current user
   - Compare with workspaces created by admin

## API Endpoints

- `GET api/workspaces/` - Returns workspaces for authenticated user
- `POST api/workspaces/{workspaceId}/user/` - Add user to workspace
- `GET api/applications/workspace/{workspaceId}/` - Get applications in workspace

## Next Steps

1. Update the one-off script to add users to workspaces (if needed)
2. Document which users should have access
3. Implement Phase 4 fix in Baserow to filter dashboard by workspace ID from parentData

