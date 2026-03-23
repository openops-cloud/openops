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

  if (!credentials || typeof credentials !== 'object') {
    throwValidationError(
      'Selected connection is misconfigured or missing Azure credentials.',
    );
  }

  let subscriptions: { subscriptionId: string; displayName: string }[];
  try {
    const tokenResult = await authenticateUserWithAzure(credentials);
    subscriptions = await getAzureSubscriptionsList(tokenResult.access_token);
  } catch {
    throwValidationError(
      'Unable to retrieve Azure subscriptions with the provided connection details.',
    );
  }

  if (subscriptions.length === 0) {
    throwValidationError(
      'No Azure subscriptions were returned for this connection. Check access and tenant configuration.',
    );
  }

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
