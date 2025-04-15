import {
  authenticateDefaultUserInOpenOpsTables,
  axiosTablesSeedRetryConfig,
} from '@openops/common';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { OrganizationRole, User } from '@openops/shared';
import { authenticationService } from '../../authentication/authentication-service';
import { Provider } from '../../authentication/authentication-service/hooks/authentication-service-hooks';
import { openopsTables } from '../../openops-tables';
import { organizationService } from '../../organization/organization.service';
import { projectService } from '../../project/project-service';
import { userService } from '../../user/user-service';

async function signIn(email: string, password: string) {
  await authenticationService.signIn({
    email,
    password,
    organizationId: null,
    provider: Provider.EMAIL,
  });
  logger.info(`Successfully signed in as admin [${email}]`, email);
}

async function upsertAdminPassword(user: User, newPassword: string) {
  const email = user.email;
  logger.info(`Updating password for admin [${email}]`, email);
  await userService.updatePassword({ id: user.id, newPassword });
}

async function upsertAdminEmail(user: User, email: string) {
  logger.info(`Updating admin email from [${user.email}] to [${email}]`, email);
  await userService.updateEmail({ id: user.id, newEmail: email });
  user.email = email;
}

const DEFAULT_ORGANIZATION_NAME = 'organization';

async function createAdmin(email: string, password: string) {
  const user = await userService.create({
    email,
    password,
    organizationRole: OrganizationRole.ADMIN,
    organizationId: null,
    verified: true,
    firstName: 'OpenOps',
    lastName: 'Admin',
    trackEvents: false,
    newsLetter: false,
  });

  const { token } = await authenticateDefaultUserInOpenOpsTables(
    axiosTablesSeedRetryConfig,
  );

  const { workspaceId, databaseId } =
    await openopsTables.createDefaultWorkspaceAndDatabase(token);

  const organization = await organizationService.create({
    ownerId: user.id,
    name: DEFAULT_ORGANIZATION_NAME,
    tablesWorkspaceId: workspaceId,
  });

  await projectService.create({
    displayName: `${user.firstName}'s Project`,
    ownerId: user.id,
    organizationId: organization.id,
    tablesDatabaseId: databaseId,
  });
}

export const upsertAdminUser = async (): Promise<void> => {
  const email = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_EMAIL);
  const password = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_PASSWORD);

  try {
    await signIn(email, password);
  } catch (e) {
    const user = await userService.getByOrganizationAndEmail({
      organizationId: null,
      email,
    });

    if (user) {
      await upsertAdminPassword(user, password);
      await signIn(email, password);
      return;
    }

    const adminUser = await userService.getDefaultAdmin();
    if (adminUser) {
      await upsertAdminEmail(adminUser, email);
      await upsertAdminPassword(adminUser, password);
      await signIn(email, password);
      return;
    }

    logger.info(`Admin user does not exist, creating it`);
    await createAdmin(email, password);
    logger.info(`Successfully created admin [${email}]`, email);
  }
};
