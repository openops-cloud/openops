import { AppConnectionStatus, BenchmarkWizardOption } from '@openops/shared';
import { appConnectionService } from '../app-connection/app-connection-service/app-connection-service';
import { removeSensitiveData } from '../app-connection/app-connection-utils';
import type { StaticOptionValue } from './wizard-config-loader';

const LIST_CONNECTIONS_LIMIT = 100;

export function resolveStaticOptions(
  values: StaticOptionValue[],
): BenchmarkWizardOption[] {
  return values.map((v) => ({
    id: v.id,
    displayName: v.displayName,
    imageLogoUrl: v.imageLogoUrl || undefined,
  }));
}

export async function resolveListConnectionsOptions(
  provider: string,
  projectId: string,
): Promise<BenchmarkWizardOption[]> {
  const authProvider = provider.toLowerCase();
  const page = await appConnectionService.list({
    projectId,
    cursorRequest: null,
    name: undefined,
    status: [AppConnectionStatus.ACTIVE],
    limit: LIST_CONNECTIONS_LIMIT,
    authProviders: [authProvider],
  });
  return page.data.map((conn) => {
    const safe = removeSensitiveData(conn);
    return {
      id: safe.id,
      displayName: safe.name,
      imageLogoUrl: undefined,
      metadata: { authProviderKey: safe.authProviderKey },
    };
  });
}
