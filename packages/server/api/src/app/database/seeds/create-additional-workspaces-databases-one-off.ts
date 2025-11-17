/**
 * ONE-OFF SCRIPT: Create Additional Workspaces and Databases
 *
 * This is a one-off script to create additional workspaces and databases
 * in the OpenOps Tables service. This script can be easily reverted by
 * removing it from main.ts imports and execution.
 *
 * IMPORTANT: Workspace Access
 * - Workspaces are created using the admin user's token
 * - The admin user automatically has access to created workspaces
 * - Other users need to be explicitly added to see these workspaces
 * - When accessing Baserow dashboard directly, ensure you're logged in as admin
 *   OR add users to workspaces (see ADD_USERS_TO_WORKSPACES option below)
 *
 * Usage:
 * 1. Configure the workspace and database names below
 * 2. Set ADD_USERS_TO_WORKSPACES to true if you want to add all users to workspaces
 * 3. Import and call this function in main.ts (temporarily)
 * 4. Run the application
 * 5. Remove the import and call after execution
 *
 * TO REVERT:
 * - Remove the import from main.ts
 * - Remove the function call from main.ts
 * - Optionally delete this file
 */

import { authenticateDefaultUserInOpenOpsTables } from '@openops/common';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { openopsTables } from '../../openops-tables';
import { organizationService } from '../../organization/organization.service';
import { userService } from '../../user/user-service';

// ============================================================================
// ONE-OFF CONFIGURATION - Modify these values as needed
// ============================================================================
const ADDITIONAL_WORKSPACES = [
  {
    name: 'Workspace 1',
    databases: ['Database 1', 'Database 2'],
  },
  {
    name: 'Workspace 2',
    databases: ['Database 1'],
  },
];

// Set to true to add all users in the organization to the newly created workspaces
// This ensures all users can see the workspaces when accessing the dashboard
const ADD_USERS_TO_WORKSPACES = false;
// ============================================================================

export async function createAdditionalWorkspacesAndDatabases(): Promise<void> {
  logger.info(
    'Starting one-off script: Create additional workspaces and databases',
  );

  try {
    const { token } = await authenticateDefaultUserInOpenOpsTables();

    for (const workspaceConfig of ADDITIONAL_WORKSPACES) {
      // Check if workspace already exists
      const existingWorkspaces = await openopsTables.listWorkspaces(token);
      let workspace = existingWorkspaces.find(
        (w) => w.name === workspaceConfig.name,
      );

      if (!workspace) {
        // Create workspace
        workspace = await openopsTables.createWorkspace(
          workspaceConfig.name,
          token,
        );
        logger.info(
          `Created workspace: ${workspace.name} (ID: ${workspace.id})`,
        );

        // Add users to workspace if configured
        if (ADD_USERS_TO_WORKSPACES) {
          await addUsersToWorkspace(workspace.id, token);
        }
      } else {
        logger.info(
          `Workspace already exists: ${workspace.name} (ID: ${workspace.id})`,
        );
      }

      // Create databases in the workspace
      for (const databaseName of workspaceConfig.databases) {
        const existingDatabases = await openopsTables.listDatabases(
          workspace.id,
          token,
        );
        const existingDatabase = existingDatabases.find(
          (db) => db.name === databaseName,
        );

        if (!existingDatabase) {
          const database = await openopsTables.createDatabase(
            workspace.id,
            databaseName,
            token,
          );
          logger.info(
            `Created database: ${database.name} (ID: ${database.id}) in workspace ${workspace.name}`,
          );
        } else {
          logger.info(
            `Database already exists: ${existingDatabase.name} (ID: ${existingDatabase.id}) in workspace ${workspace.name}`,
          );
        }
      }
    }

    logger.info('One-off script completed successfully');
  } catch (error) {
    logger.error(
      'Error in one-off script: Create additional workspaces and databases',
      {
        error,
      },
    );
    throw error;
  }
}

/**
 * Add all users in the organization to the specified workspace
 * This ensures all users can see and access the workspace
 */
async function addUsersToWorkspace(
  workspaceId: number,
  adminToken: string,
): Promise<void> {
  try {
    // Get admin user email to skip adding them (they already have access)
    const adminEmail = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_EMAIL);

    // Get the default organization (oldest one)
    // This is a one-off script, so we'll add users from the default org
    // You can modify this to iterate through all organizations if needed
    const defaultOrg = await organizationService.getOldestOrganization();
    if (!defaultOrg) {
      logger.warn('No organization found, skipping user addition to workspace');
      return;
    }

    // Get all users from the default organization
    const usersPage = await userService.list({ organizationId: defaultOrg.id });
    const users = usersPage.data;

    logger.info(`Adding ${users.length} user(s) to workspace ${workspaceId}`);

    for (const user of users) {
      // Skip admin user (they already have access as creator)
      if (user.email === adminEmail) {
        continue;
      }

      try {
        await openopsTables.addUserToWorkspace(adminToken, {
          email: user.email,
          workspaceId,
          permissions: 'MEMBER',
        });
        logger.info(`Added user ${user.email} to workspace ${workspaceId}`);
      } catch (error) {
        // User might already be in workspace, or email might not exist in Baserow
        logger.warn(
          `Failed to add user ${user.email} to workspace ${workspaceId}`,
          { error },
        );
      }
    }
  } catch (error) {
    logger.error('Error adding users to workspace', { workspaceId, error });
    // Don't throw - workspace creation succeeded, user addition is optional
  }
}
