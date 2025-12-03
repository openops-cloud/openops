import { AppSystemProp, logger, system } from '@openops/server-shared';
import { projectService } from '../../project/project-service';
import { userService } from '../../user/user-service';
import { authenticateAdminUserInOpenOpsTables } from '../auth-admin-tables';
import { createAggregatedCostsTable } from './create-aggregated-costs-table';
import { createAutoInstancesShutdownTable } from './create-auto-instances-shutdown-table';
import { createBusinessUnitsTable } from './create-business-units-table';
import { createIdleEbsVolumesToDeleteTable } from './create-idle-ebs-volumes-to-delete-table';
import { createKnownCostTypesByApplicationTable } from './create-known-cost-types-by-application-table';
import { createOpportunitiesTable } from './create-opportunities-table';
import { createResourceBuTagAssignmentTable } from './create-resource-bu-tag-assignment-table';
import { createTagOwnerMappingTable } from './create-tag-owner-mapping-table';

const getProjectTablesDatabaseId = async (): Promise<number> => {
  const email = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_EMAIL);
  const user = await userService.getByOrganizationAndEmail({
    organizationId: null,
    email,
  });

  if (!user) {
    throw new Error(`Admin user not found for email: ${email}`);
  }

  const project = await projectService.getOneForUser(user);

  if (!project) {
    throw new Error(`No project found for user: ${email}`);
  }

  return project.tablesDatabaseId;
};

const seedBaseTemplateTables = async (
  databaseId: number,
  token: string,
): Promise<void> => {
  const buTable = await createBusinessUnitsTable(databaseId, token);
  await createTagOwnerMappingTable(databaseId, token, buTable.tableId);
  await createIdleEbsVolumesToDeleteTable(databaseId, token);
  await createResourceBuTagAssignmentTable(databaseId, token, buTable.tableId);
};

const seedAdditionalTemplateTables = async (
  databaseId: number,
  token: string,
): Promise<void> => {
  await createOpportunitiesTable(token, databaseId);
  await createAggregatedCostsTable(databaseId, token);
  await createKnownCostTypesByApplicationTable(token, databaseId);
  await createAutoInstancesShutdownTable(token, databaseId);
};

export const seedTemplateTablesService = {
  async createBaseTemplateTables() {
    const { token } = await authenticateAdminUserInOpenOpsTables();
    const databaseId = await getProjectTablesDatabaseId();

    await seedBaseTemplateTables(databaseId, token);

    logger.info('[Seeding template tables] Done');
  },

  async seedTemplateTablesForDatabase(
    databaseId: number,
    token: string,
  ): Promise<void> {
    await seedBaseTemplateTables(databaseId, token);
    await seedAdditionalTemplateTables(databaseId, token);
  },

  async createOpportunityTemplateTable() {
    const { token } = await authenticateAdminUserInOpenOpsTables();
    const databaseId = await getProjectTablesDatabaseId();

    await createOpportunitiesTable(token, databaseId);

    logger.info('[Seeding opportunity template table] Done');
  },

  async createAggregatedCostsTable() {
    const { token } = await authenticateAdminUserInOpenOpsTables();
    const databaseId = await getProjectTablesDatabaseId();

    await createAggregatedCostsTable(databaseId, token);
  },

  async createKnownCostTypesByApplicationTable() {
    const { token } = await authenticateAdminUserInOpenOpsTables();
    const databaseId = await getProjectTablesDatabaseId();

    await createKnownCostTypesByApplicationTable(token, databaseId);

    logger.info('[Seeding Known cost types by application table] Done');
  },

  async createAutoInstancesShutdownTable(): Promise<void> {
    const { token } = await authenticateAdminUserInOpenOpsTables();
    const databaseId = await getProjectTablesDatabaseId();

    await createAutoInstancesShutdownTable(token, databaseId);

    logger.info('[Seeding Auto Instances Shutdown table] Done');
  },
};
