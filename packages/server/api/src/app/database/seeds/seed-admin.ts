import { AppSystemProp, logger, system } from '@openops/server-shared';
import {
  EncryptedObject,
  Organization,
  OrganizationRole,
  Project,
  Provider,
  User,
} from '@openops/shared';
import { authenticationService } from '../../authentication/basic/authentication-service';
import { openopsTables } from '../../openops-tables';
import { authenticateAdminUserInOpenOpsTables } from '../../openops-tables/auth-admin-tables';
import { TalesWorkspaceContext } from '../../openops-tables/default-workspace-database';
import { organizationService } from '../../organization/organization.service';
import { projectService } from '../../project/project-service';
import { userService } from '../../user/user-service';
import { getAdminProject } from './get-admin-project';

const DEFAULT_ORGANIZATION_NAME = 'organization';

export const upsertAdminUser = async (): Promise<void> => {
  const email = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_EMAIL);
  const password = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_PASSWORD);

  try {
    await signIn(email, password);
  } catch (e) {
    logger.debug(`Failed to sign in as admin [${email}]`, e);

    const user = await ensureUserExists(email, password);

    const { organization, project } = await resolveUserOrganizationContext(
      user,
    );

    const talesWorkspaceContext = project
      ? ({
          databaseToken: project.tablesDatabaseToken,
          workspaceId: project.tablesWorkspaceId,
          databaseId: project.tablesDatabaseId,
        } as TalesWorkspaceContext<EncryptedObject>)
      : undefined;

    const { workspaceId, databaseId, databaseToken } =
      await ensureOpenOpsTablesWorkspaceAndDatabaseExist(talesWorkspaceContext);

    const organizationId = organization
      ? organization.id
      : (await createOrganization(user)).id;

    const userWithOrganization = {
      ...user,
      organizationId,
    };

    if (!project) {
      await createProject(
        userWithOrganization,
        databaseId,
        workspaceId,
        databaseToken,
      );
    }
  }
};

async function signIn(email: string, password: string): Promise<void> {
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

  logger.info(
    `Admin user does not exist, creating new admin user [${email}]`,
    email,
  );

  user = await createAdminUser(email, password);
  return user;
}

async function resolveUserOrganizationContext(
  user: User,
): Promise<{ organization?: Organization; project?: Project }> {
  if (user.organizationId) {
    const existingOrganization = await organizationService.getOne(
      user.organizationId,
    );

    if (!existingOrganization) {
      throw new Error(
        'User has organizationId but organization does not exist',
      );
    }

    const project = (await getAdminProject(user)) ?? undefined;
    return {
      organization: existingOrganization,
      project,
    };
  }

  return {};
}

async function ensureOpenOpsTablesWorkspaceAndDatabaseExist(
  params?: TalesWorkspaceContext<EncryptedObject>,
): Promise<TalesWorkspaceContext> {
  const { token } = await authenticateAdminUserInOpenOpsTables();

  const { workspaceId, databaseId, databaseToken } =
    await openopsTables.createDefaultWorkspaceAndDatabase(params, token);

  if (!workspaceId || !databaseId || !databaseToken) {
    throw new Error('Failed to create OpenOps Tables workspace or database');
  }

  logger.info(`OpenOps Tables workspace and database exist`, {
    workspaceId,
    databaseId,
  });

  return { workspaceId, databaseId, databaseToken };
}

async function createOrganization(user: User): Promise<Organization> {
  return organizationService.create({
    ownerId: user.id,
    name: DEFAULT_ORGANIZATION_NAME,
  });
}

type UserWithOrganization = User & {
  organizationId: string;
};

async function createProject(
  user: UserWithOrganization,
  databaseId: number,
  workspaceId: number,
  databaseToken: string,
): Promise<Project> {
  return projectService.create({
    displayName: `${user.firstName}'s Project`,
    ownerId: user.id,
    organizationId: user.organizationId,
    tablesDatabaseId: databaseId,
    tablesWorkspaceId: workspaceId,
    tablesDatabaseToken: databaseToken,
  });
}

async function upsertAdminPassword(
  user: User,
  newPassword: string,
): Promise<void> {
  const email = user.email;
  logger.info(`Updating password for admin [${email}]`, email);

  await userService.updateAdminPassword({
    id: user.id,
    newPassword,
  });
}

async function upsertAdminEmail(user: User, email: string): Promise<void> {
  logger.info(`Updating admin email from [${user.email}] to [${email}]`, email);
  await userService.updateEmail({ id: user.id, newEmail: email });
  user.email = email;
}

function createAdminUser(email: string, password: string): Promise<User> {
  return userService.createAdminUser({
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
