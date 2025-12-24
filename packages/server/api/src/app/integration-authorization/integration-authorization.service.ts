import { encryptUtils } from '@openops/server-shared';
import { IntegrationName, openOpsId, Principal } from '@openops/shared';
import { accessTokenManager } from '../authentication/context/access-token-manager';
import { repoFactory } from '../core/db/repo-factory';
import { IntegrationAuthorizationEntity } from './integration-authorization.entity';

export const integrationAuthorizationRepo = repoFactory(
  IntegrationAuthorizationEntity,
);

export const integrationAuthorizationService = {
  async connect({
    principal,
    userToken,
    integrationName,
  }: ConnectParams): Promise<{ token: string }> {
    const token = await accessTokenManager.generateTokenGeneratorToken(
      userToken,
    );

    const repo = integrationAuthorizationRepo();

    await repo.save({
      id: openOpsId(),
      userId: principal.id,
      projectId: principal.projectId,
      organizationId: principal.organization.id,
      integrationName,
      token: encryptUtils.encryptString(token),
      isRevoked: false,
    });

    return {
      token,
    };
  },
  async exists({
    userId,
    projectId,
    integrationName,
  }: ExistsParams): Promise<{ exists: boolean }> {
    const repo = integrationAuthorizationRepo();

    const auth = await repo.findOneBy({
      userId,
      projectId,
      integrationName,
      isRevoked: false,
    });

    return {
      exists: !!auth,
    };
  },
  async revoke({
    userId,
    projectId,
    integrationName,
  }: RevokeParams): Promise<void> {
    const repo = integrationAuthorizationRepo();

    await repo.update(
      {
        userId,
        projectId,
        integrationName,
        isRevoked: false,
      },
      {
        isRevoked: true,
      },
    );
  },
};

type ConnectParams = {
  principal: Principal;
  userToken: string;
  integrationName: IntegrationName;
};

type ExistsParams = {
  userId: string;
  projectId: string;
  integrationName: IntegrationName;
};

type RevokeParams = {
  userId: string;
  projectId: string;
  integrationName: IntegrationName;
};
