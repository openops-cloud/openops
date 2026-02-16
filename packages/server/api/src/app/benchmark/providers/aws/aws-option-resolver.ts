import { AppConnectionStatus, BenchmarkWizardOption } from '@openops/shared';
import { appConnectionService } from '../../../app-connection/app-connection-service/app-connection-service';
import { throwValidationError } from '../../errors';
import type { WizardContext } from '../../provider-adapter';

/** IAM role ARN format: arn:partition:iam::accountId:role/roleName */
function getAccountIdFromRoleArn(assumeRoleArn: string): string {
  const parts = assumeRoleArn.split(':');
  return parts.length >= 5 ? parts[4] : assumeRoleArn;
}

type AwsConnectionValue = {
  roles?: Array<{ assumeRoleArn: string; accountName: string }>;
};

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
  context: WizardContext,
): Promise<BenchmarkWizardOption[]> {
  const connectionId = context.benchmarkConfiguration?.connection?.[0];
  if (!connectionId) {
    return [];
  }

  const connection = await appConnectionService.getOneOrThrow({
    id: connectionId,
    projectId: context.projectId,
  });

  const value = connection.value as AwsConnectionValue | undefined;
  const roles = value?.roles ?? [];
  if (roles.length === 0) {
    return [];
  }

  return roles.map((role) => ({
    id: getAccountIdFromRoleArn(role.assumeRoleArn),
    displayName: role.accountName || getAccountIdFromRoleArn(role.assumeRoleArn),
  }));
}
