import { authenticateDefaultUserInOpenOpsTables } from '@openops/common';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { OrganizationRole, User } from '@openops/shared';
import { authenticationService } from '../../authentication/authentication-service';
import { Provider } from '../../authentication/authentication-service/hooks/authentication-service-hooks';
import { openopsTables } from '../../openops-tables';
import { organizationService } from '../../organization/organization.service';
import { projectService } from '../../project/project-service';
import { userService } from '../../user/user-service';

const DEFAULT_ORGANIZATION_NAME = 'organization';

export const upsertAdminUser = async (): Promise<void> => {
  const email = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_EMAIL);
  const password = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_PASSWORD);

  try {
    await signIn(email, password);
  } catch (e) {
    logger.debug(`Failed to sign in as admin [${email}]`, e);

    const user = await ensureUserExists(email, password);
    const { workspaceId, databaseId } =
      await ensureOpenOpsTablesWorkspaceAndDatabaseExist(user);
    await ensureOrganizationExists(user, workspaceId);
    await ensureProjectExists(user, databaseId);
  }
};

async function signIn(email: string, password: string) {
  await authenticationService.signIn({
    email,
    password,
    organizationId: null,
    provider: Provider.EMAIL,
  });
  logger.info(`Successfully signed in as admin [${email}]`, email);
}

async function ensureUserExists(
  email: string,
  password: string,
): Promise<User> {
  let user = await userService.getByOrganizationAndEmail({
    organizationId: null,
    email,
  });

  if (user) {
    logger.info(
      `Admin user already exists [${email}], updating their password`,
      email,
    );
    await upsertAdminPassword(user, password);
    return user;
  }

  user = await userService.getDefaultAdmin();
  if (user) {
    logger.info(
      `Default admin user exists but with different email, updating email to [${email}] and their password`,
      email,
    );
    await upsertAdminEmail(user, email);
    await upsertAdminPassword(user, password);
    return user;
  }

  logger.info(`Admin user does not exist, creating new admin user [${email}]`, email);
  return createAdminUser(email, password);
}

async function ensureOpenOpsTablesWorkspaceAndDatabaseExist(
  user: User,
): Promise<{ workspaceId: number; databaseId: number }> {
  const { token } = await authenticateDefaultUserInOpenOpsTables();

  const { workspaceId, databaseId } =
    await openopsTables.createDefaultWorkspaceAndDatabase(token);

  if (!workspaceId || !databaseId) {
    throw new Error('Failed to create OpenOps Tables workspace or database');
  }

  logger.info(`OpenOps Tables workspace and database exist`, {
    workspaceId,
    databaseId,
  });

  return { workspaceId, databaseId };
}

async function ensureOrganizationExists(user: User, tablesWorkspaceId: number) {
  if (user.organizationId) {
    const existingOrganization = await organizationService.getOne(
      user.organizationId,
    );
    if (!existingOrganization) {
      throw new Error(
        'User has organizationId but organization does not exist',
      );
    }
    if (existingOrganization.tablesWorkspaceId !== tablesWorkspaceId) {
      throw new Error(
        'User organization exists but with different tablesWorkspaceId',
      );
    }
    return existingOrganization;
  }
  const organization = await organizationService.create({
    ownerId: user.id,
    name: DEFAULT_ORGANIZATION_NAME,
    tablesWorkspaceId,
  });
  user.organizationId = organization.id;
  return organization;
}

async function ensureProjectExists(user: User, databaseId: number) {
  const project = await projectService.getOneForUser(user);
  if (project) {
    if (project.tablesDatabaseId !== databaseId) {
      throw new Error(
        'User project exists but with different tablesDatabaseId',
      );
    }
    return project;
  }

  return projectService.create({
    displayName: `${user.firstName}'s Project`,
    ownerId: user.id,
    organizationId: user.organizationId!,
    tablesDatabaseId: databaseId,
  });
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

function createAdminUser(email: string, password: string): Promise<User> {
  return userService.create({
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
}
