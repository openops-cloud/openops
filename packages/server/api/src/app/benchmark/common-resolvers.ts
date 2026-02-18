import { AppConnectionStatus, BenchmarkWizardOption } from '@openops/shared';
import { appConnectionService } from '../app-connection/app-connection-service/app-connection-service';
import { throwValidationError } from './errors';
import type { WizardContext } from './provider-adapter';

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

  return page.data.map((connection) => ({
    id: connection.id,
    displayName: connection.name,
    metadata: { authProviderKey: connection.authProviderKey },
  }));
}
