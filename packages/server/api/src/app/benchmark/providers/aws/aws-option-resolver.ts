import { AppConnectionStatus, BenchmarkWizardOption } from '@openops/shared';
import { appConnectionService } from '../../../app-connection/app-connection-service/app-connection-service';
import { throwValidationError } from '../../errors';
import type { WizardContext } from '../../provider-adapter';

export async function resolveOptions(
  method: string,
  context: WizardContext,
): Promise<BenchmarkWizardOption[]> {
  switch (method) {
    case 'listConnections':
      return listConnections(context);
    case 'getConnectionAccounts':
      return getConnectionAccounts(context);
    default:
      throw new Error(`Unknown AWS wizard option method: ${method}`);
  }
}

async function listConnections(
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

async function getConnectionAccounts(
  _context: WizardContext,
): Promise<BenchmarkWizardOption[]> {
  // TODO: Get selected connection id from context.benchmarkConfiguration?.connection,
  // then call provider-specific API to list accounts for that connection.
  return [];
}
