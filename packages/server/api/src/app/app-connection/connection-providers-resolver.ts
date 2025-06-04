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

type ProviderMetadata = {
  id: Provider;
  displayName: string;
  logoUrl: string;
  supportedBlocks: string[];
  props: unknown;
};

export async function getProviderMetadataForAllBlocks(
  projectId: string,
): Promise<Partial<Record<Provider, ProviderMetadata>>> {
  const blocks = await blockMetadataService.list({
    projectId,
    release: await flagService.getCurrentRelease(),
    includeHidden: false,
    edition: system.getEdition(),
  });

  const providerMetadata: Partial<Record<Provider, ProviderMetadata>> = {};

  for (const block of blocks) {
    if (block.auth) {
      const provider = block.auth.provider;
      if (!providerMetadata[provider.id]) {
        providerMetadata[provider.id] = {
          id: provider.id,
          displayName: provider.displayName,
          logoUrl: provider.logoUrl,
          supportedBlocks: [],
          props: block.auth ?? {},
        };
      }
      providerMetadata[provider.id]?.supportedBlocks.push(block.name);
    }
  }

  return providerMetadata;
}
