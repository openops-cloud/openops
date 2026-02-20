import { AppConnectionStatus, BenchmarkWizardOption } from '@openops/shared';
import { appConnectionService } from '../app-connection/app-connection-service/app-connection-service';
import { getAuthProviderMetadata } from '../app-connection/connection-providers-resolver';
import { throwValidationError } from './errors';
import type { WizardContext } from './provider-adapter';

export async function getAuthProviderLogoUrl(
  authProviderKey: string,
  projectId: string,
): Promise<string | undefined> {
  const auth = await getAuthProviderMetadata(authProviderKey, projectId);
  return auth?.authProviderLogoUrl;
}

export async function listConnections(
  context: WizardContext,
): Promise<BenchmarkWizardOption[]> {
  if (!context.projectId) {
    throwValidationError('projectId is required to list connections');
  }

  const page = await appConnectionService.list({
    projectId: context.projectId,
    authProviders: [context.provider],
    status: [AppConnectionStatus.ACTIVE],
    limit: 100,
    cursorRequest: null,
    name: undefined,
    connectionsIds: undefined,
  });

  const options = await Promise.all(
    page.data.map(async (connection) => {
      const imageLogoUrl = await getAuthProviderLogoUrl(
        connection.authProviderKey,
        context.projectId,
      );
      return {
        id: connection.id,
        displayName: connection.name,
        ...(imageLogoUrl && { imageLogoUrl }),
        metadata: { authProviderKey: connection.authProviderKey },
      };
    }),
  );
  return options;
}
