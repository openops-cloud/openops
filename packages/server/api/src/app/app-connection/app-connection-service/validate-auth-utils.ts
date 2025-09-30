import { system } from '@openops/server-shared';
import { blockMetadataService } from '../../blocks/block-metadata-service';
import { flagService } from '../../flags/flag.service';

export async function findBlockByAuthProviderKey(
  authProviderKey: string,
  projectId: string,
): Promise<{ name: string; version: string } | undefined> {
  const release = await flagService.getCurrentRelease();
  const edition = system.getEdition();

  const blocks = await blockMetadataService.list({
    includeHidden: false,
    projectId,
    release,
    edition,
  });

  const block = blocks.find(
    (block) => block.auth?.authProviderKey === authProviderKey,
  );

  if (!block) return undefined;
  return { name: block.name, version: block.version };
}
