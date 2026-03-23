import {
  authenticateUserWithAzure,
  getAzureRegionsList,
  getAzureSubscriptionsList,
} from '@openops/common';
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

export async function resolveOptions(
  method: string,
  context: WizardContext,
): Promise<BenchmarkWizardOption[]> {
  switch (method) {
    case 'listConnections':
      return listConnections(context);
    case 'getSubscriptionsList':
      return getSubscriptionsList(context);
    case 'getRegionsList':
      return getAzureRegionsList().map((region) => ({
        ...region,
        imageLogoUrl: REGION_IMAGE_LOGO_URL,
      }));
    default:
      throwValidationError(`Unknown Azure wizard option method: ${method}`);
  }
}

async function getSubscriptionsList(
  context: WizardContext,
): Promise<BenchmarkWizardOption[]> {
  const connectionId = context.benchmarkConfiguration?.connection?.[0];
  if (!connectionId) {
    throwValidationError('Connection must be selected to list subscriptions');
  }

  const connection = await appConnectionService.getOneOrThrow({
    id: connectionId,
    projectId: context.projectId,
  });

  const credentials = (connection.value as CustomAuthConnectionValue)?.props;
  const tokenResult = await authenticateUserWithAzure(credentials);
  const subscriptions = await getAzureSubscriptionsList(
    tokenResult.access_token,
  );

  const imageLogoUrl = await getAuthProviderLogoUrl(
    connection.authProviderKey,
    context.projectId,
  );

  return subscriptions.map((sub) => ({
    id: sub.subscriptionId,
    displayName: sub.displayName,
    ...(imageLogoUrl && { imageLogoUrl }),
  }));
}
