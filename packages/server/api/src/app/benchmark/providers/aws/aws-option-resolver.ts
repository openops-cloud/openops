import { getRegionsList, parseArn } from '@openops/common';
import {
  BenchmarkWizardOption,
  CustomAuthConnectionValue,
  REGION_IMAGE_LOGO_URL,
} from '@openops/shared';
import { appConnectionService } from '../../../app-connection/app-connection-service/app-connection-service';
import {
  getAuthProviderLogoUrl,
  listConnections,
} from '../../common-resolvers';
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
    case 'getRegionsList':
      return getRegionsList().map((region) => ({
        ...region,
        imageLogoUrl: REGION_IMAGE_LOGO_URL,
      }));
    default:
      throwValidationError(`Unknown AWS wizard option method: ${method}`);
  }
}

export async function getConnectionAccounts(
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

  const imageLogoUrl = await getAuthProviderLogoUrl(
    connection.authProviderKey,
    context.projectId,
  );

  const accountMap = new Map<string, BenchmarkWizardOption>();
  for (const role of roles) {
    const accountId = parseArn(role.assumeRoleArn).accountId;
    if (!accountMap.has(accountId)) {
      accountMap.set(accountId, {
        id: accountId,
        displayName: role.accountName,
        ...(imageLogoUrl && { imageLogoUrl }),
      });
    }
  }
  return Array.from(accountMap.values());
}
