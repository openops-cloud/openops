import { parseArn } from '@openops/common';
import {
  BenchmarkWizardOption,
  CustomAuthConnectionValue,
} from '@openops/shared';
import { appConnectionService } from '../../../app-connection/app-connection-service/app-connection-service';
import { listConnections } from '../../common-resolvers';
import { throwValidationError } from '../../errors';
import type { WizardContext } from '../../provider-adapter';

type AwsAuthProps = {
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
      throwValidationError(`Unknown AWS wizard option method: ${method}`);
  }
}

async function getConnectionAccounts(
  context: WizardContext,
): Promise<BenchmarkWizardOption[]> {
  const connectionId = context.benchmarkConfiguration?.connection?.[0];
  if (!connectionId) {
    throwValidationError('Connection must be selected to list accounts');
  }

  const connection = await appConnectionService.getOneOrThrow({
    id: connectionId,
    projectId: context.projectId,
  });

  const props = (connection.value as CustomAuthConnectionValue)?.props as
    | AwsAuthProps
    | undefined;
  const roles = props?.roles;
  if (!roles?.length) {
    return [];
  }

  return roles.map((role) => ({
    id: parseArn(role.assumeRoleArn).accountId,
    displayName: role.accountName,
  }));
}
