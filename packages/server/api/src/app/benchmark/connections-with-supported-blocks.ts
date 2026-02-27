import type { AppConnectionsWithSupportedBlocks } from '@openops/shared';
import { appConnectionService } from '../app-connection/app-connection-service/app-connection-service';
import { getProviderMetadataForAllBlocks } from '../app-connection/connection-providers-resolver';

export async function fetchConnectionsWithSupportedBlocks(
  projectId: string,
  connectionIds: string[],
): Promise<AppConnectionsWithSupportedBlocks[]> {
  const [connectionsList, providersMetadata] = await Promise.all([
    appConnectionService.listActiveConnectionsByIds(projectId, connectionIds),
    getProviderMetadataForAllBlocks(projectId),
  ]);
  if (!providersMetadata) {
    throw new Error(`Provider metadata not found for projectId=${projectId}`);
  }
  return connectionsList.map((connection) => {
    const providerMetadata = providersMetadata[connection.authProviderKey];
    if (!providerMetadata) {
      throw new Error(
        `Missing provider metadata for authProviderKey=${connection.authProviderKey} projectId=${projectId}`,
      );
    }
    return {
      ...connection,
      supportedBlocks: providerMetadata.supportedBlocks,
    };
  });
}
