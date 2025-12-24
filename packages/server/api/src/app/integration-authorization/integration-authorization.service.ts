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
};

type ConnectParams = {
  principal: Principal;
  userToken: string;
  integrationName: IntegrationName;
};
