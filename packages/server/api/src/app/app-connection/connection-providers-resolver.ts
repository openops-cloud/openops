import { logger, system } from '@openops/server-shared';
import { Provider } from '@openops/shared';
import { blockMetadataService } from '../blocks/block-metadata-service';
import { flagService } from '../flags/flag.service';

export async function resolveProvidersForBlocks(
  blockNames: string[],
  projectId: string,
): Promise<Provider[]> {
  const release = await flagService.getCurrentRelease();
  const edition = system.getEdition();

  const blocks = await blockMetadataService.list({
    includeHidden: false,
    projectId,
    release,
    edition,
  });

  const providers: Provider[] = [];
  const blockMap = new Map(blocks.map((b) => [b.name, b]));

  for (const blockName of blockNames) {
    const block = blockMap.get(blockName);
    if (!block) {
      logger.warn(`Block not found. Block name: ${blockName}`);
      continue;
    }

    const providerId = block.auth?.provider?.id;
    if (providerId) {
      providers.push(providerId);
    }
  }

  return [...new Set(providers)];
}
