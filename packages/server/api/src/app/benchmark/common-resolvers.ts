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

  if (page.data.length === 0) {
    throwValidationError('No connections found for this provider');
  }

  const authProviderKey = page.data[0].authProviderKey;
  const providerLogoUrl = await getAuthProviderLogoUrl(
    authProviderKey,
    context.projectId,
  );

  return page.data.map((connection) => ({
    id: connection.id,
    displayName: connection.name,
    ...(providerLogoUrl && { imageLogoUrl: providerLogoUrl }),
    metadata: { authProviderKey: connection.authProviderKey },
  }));
}
