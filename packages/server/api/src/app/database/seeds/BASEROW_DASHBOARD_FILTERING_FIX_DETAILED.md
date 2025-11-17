# Baserow Dashboard Filtering Fix - Detailed Implementation Guide

## Problem Confirmed

**Current Behavior:**

- **Sidebar**: Shows only "OpenOps Dataset" (the currently selected workspace from `baserow_group_id` cookie)
- **Dashboard View**: Shows ALL workspaces and databases (OpenOps Dataset, Database 1, Database 2, etc.)

**Root Cause:**
The dashboard view (`dashboard.vue`) iterates over `sortedWorkspaces: 'workspace/getAllSorted'` which returns ALL workspaces the user has access to, without filtering by the selected workspace.

**How Workspace Selection Works:**

1. Cookie `baserow_group_id` stores the selected workspace ID
2. Middleware (`workspacesAndApplications.js`) reads cookie via `getWorkspaceCookie(app)`
3. Calls `store.dispatch('workspace/selectById', workspaceId)` which sets `state.selected`
4. Sidebar uses `getAllOfWorkspace(selectedWorkspace)` - correctly filtered ✅
5. Dashboard uses `getAllSorted` - shows ALL workspaces ❌

**Verification:**
Changing `baserow_group_id` cookie from 1 to 2 in dev tools confirms:

- Sidebar correctly updates to show workspace 2's databases
- Dashboard still shows all workspaces (the bug)

## Code Analysis

### Current Dashboard Implementation

**File:** `web-frontend/modules/core/pages/dashboard.vue`

```vue
<template>
  <div class="dashboard">
    <DashboardWorkspace
      v-for="workspace in sortedWorkspaces"
      :key="workspace.id"
      :workspace="workspace"
    ></DashboardWorkspace>
  </div>
</template>

<script>
computed: {
  sortedWorkspaces: 'workspace/getAllSorted',  // ❌ Returns ALL workspaces
}
</script>
```

**Issue:** `getAllSorted` returns all workspaces, not just the selected one.

### Sidebar Implementation (Reference)

The sidebar correctly uses the selected workspace from the store/cookie. The middleware (`workspacesAndApplications.js`) sets the selected workspace:

```javascript
// Middleware sets selected workspace
await store.dispatch('workspace/selectById', workspaceId);
```

## Solution

### Option 1: Filter by Selected Workspace (Recommended - Simplest Fix)

Filter the dashboard to show only the currently selected workspace, matching the sidebar behavior. This is the same pattern used in `workspace.vue`.

**Modify:** `web-frontend/modules/core/pages/dashboard.vue`

```vue
<template>
  <div class="dashboard">
    <DashboardWorkspace
      v-for="workspace in filteredWorkspaces"
      :key="workspace.id"
      :workspace="workspace"
    ></DashboardWorkspace>
  </div>
</template>

<script>
computed: {
  ...mapGetters({
    sortedWorkspaces: 'workspace/getAllSorted',
    selectedWorkspace: 'workspace/getSelected',  // Get selected workspace from store
  }),
  filteredWorkspaces() {
    // Show only the selected workspace (matching sidebar behavior)
    // If no workspace is selected, show all (fallback for edge cases)
    if (this.selectedWorkspace && Object.keys(this.selectedWorkspace).length > 0) {
      return [this.selectedWorkspace]
    }
    // Fallback: show all workspaces if none selected (shouldn't happen normally)
    return this.sortedWorkspaces
  },
}
</script>
```

**Reference Implementation:**
See `web-frontend/modules/core/pages/workspace.vue` line 347:

```javascript
orderedApplicationsInSelectedWorkspace() {
  return this.getAllOfWorkspace(this.selectedWorkspace).sort(...)
}
```

This shows the correct pattern - use `selectedWorkspace` instead of iterating over all workspaces.

### Option 2: Filter by Workspace ID from parentData (For OpenOps Integration)

When accessed via OpenOps iframe, extract `workspaceId` from `parentData` and filter by that.

**Modify:** `web-frontend/modules/core/pages/dashboard.vue`

```vue
<script>
export default {
  data() {
    return {
      workspaceIdFromParent: null,
    };
  },
  async mounted() {
    // Extract workspaceId from parentData query parameter
    const queryParams = this.$route.query;
    if (queryParams.parentData) {
      try {
        const parentData = JSON.parse(
          decodeURIComponent(queryParams.parentData),
        );
        if (parentData.workspaceId) {
          this.workspaceIdFromParent = parentData.workspaceId;
          // Optionally select this workspace in the store
          await this.$store.dispatch(
            'workspace/selectById',
            parentData.workspaceId,
          );
        }
      } catch (e) {
        console.warn('Failed to parse parentData', e);
      }
    }
  },
  computed: {
    ...mapGetters({
      sortedWorkspaces: 'workspace/getAllSorted',
      selectedWorkspace: 'workspace/getSelected',
    }),
    filteredWorkspaces() {
      // Priority: workspaceId from parentData > selected workspace > all
      if (this.workspaceIdFromParent) {
        return this.sortedWorkspaces.filter(
          (w) => w.id === this.workspaceIdFromParent,
        );
      }
      if (this.selectedWorkspace) {
        return [this.selectedWorkspace];
      }
      return this.sortedWorkspaces;
    },
  },
};
</script>
```

## Implementation Steps

1. **Extract workspace ID from parentData:**

   - Parse `parentData` query parameter in `dashboard.vue`
   - Extract `workspaceId` from the parsed JSON
   - Store it in component data or select it in the store

2. **Filter workspaces:**

   - Add computed property `filteredWorkspaces`
   - Filter `sortedWorkspaces` by the workspace ID (from parentData or selected)
   - Use `filteredWorkspaces` in the template instead of `sortedWorkspaces`

3. **Ensure consistency:**

   - Make sure the selected workspace matches the workspace from parentData
   - Update the middleware if needed to respect parentData workspace

4. **Testing:**
   - Test with `parentData` containing `workspaceId`
   - Test without `parentData` (should fall back to selected workspace or all)
   - Verify dashboard matches sidebar behavior

## Files to Modify

1. **`web-frontend/modules/core/pages/dashboard.vue`**

   - Add `parentData` parsing logic
   - Add `filteredWorkspaces` computed property
   - Update template to use `filteredWorkspaces`

2. **`web-frontend/modules/core/middleware/workspacesAndApplications.js`** (Optional)
   - Extract `workspaceId` from `parentData` if available
   - Set it as the selected workspace before the dashboard loads

## Expected Result

After the fix:

- **Sidebar**: Shows "OpenOps Dataset" (selected workspace)
- **Dashboard View**: Shows only "OpenOps Dataset" and its tables (matching sidebar)
- When accessed via OpenOps iframe with `parentData.workspaceId`, both sidebar and dashboard show only that workspace

## OpenOps Integration

The `workspaceId` is already being passed from OpenOps:

**File:** `packages/react-ui/src/app/routes/openops-tables/index.tsx`

```typescript
const parentData = encodeURIComponent(
  JSON.stringify({
    workspaceId: platform?.tablesWorkspaceId, // ✅ Already being passed
    // ... other data
  }),
);
```

The Baserow dashboard just needs to extract and use this `workspaceId` to filter the view.
