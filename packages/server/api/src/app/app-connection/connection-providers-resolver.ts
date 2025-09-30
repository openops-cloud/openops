import { BlockAuthProperty } from '@openops/blocks-framework';
import { logger, system } from '@openops/server-shared';
import { blockMetadataService } from '../blocks/block-metadata-service';
import { flagService } from '../flags/flag.service';

export async function resolveProvidersForBlocks(
  blockNames: string[],
  projectId: string,
): Promise<Record<string, string[]>> {
  const release = await flagService.getCurrentRelease();
  const edition = system.getEdition();

  const blocks = await blockMetadataService.list({
    includeHidden: false,
    projectId,
    release,
    edition,
  });

  const blockToProvider: Record<string, string[]> = {};
  const blockMap = new Map(blocks.map((b) => [b.name, b]));

  for (const blockName of blockNames) {
    const block = blockMap.get(blockName);
    if (!block) {
      logger.warn(`Block not found. Block name: ${blockName}`);
      continue;
    }

    const authProviderKey = block.auth?.authProviderKey;
    if (!authProviderKey) {
      continue;
    }

    if (blockToProvider[authProviderKey]) {
      blockToProvider[authProviderKey].push(blockName);
    } else {
      blockToProvider[authProviderKey] = [blockName];
    }
  }

  return blockToProvider;
}

type ProviderMetadata = BlockAuthProperty & {
  supportedBlocks: string[];
};

export async function getProviderMetadataForAllBlocks(
  projectId: string,
): Promise<Partial<Record<string, ProviderMetadata>>> {
  const blocks = await blockMetadataService.list({
    projectId,
    release: await flagService.getCurrentRelease(),
    includeHidden: false,
    edition: system.getEdition(),
  });

  const providerMetadata: Partial<Record<string, ProviderMetadata>> = {};

  for (const block of blocks) {
    if (block.auth && Object.keys(block.auth).length > 0) {
      const authProvider = block.auth;
      providerMetadata[authProvider.authProviderKey] ??= {
        ...authProvider,
        supportedBlocks: [],
      };

      providerMetadata[authProvider.authProviderKey]?.supportedBlocks.push(
        block.name,
      );
    }
  }

  return providerMetadata;
}

export async function getAuthProviderMetadata(
  authProviderKey: string,
  projectId: string,
): Promise<BlockAuthProperty | undefined> {
  const release = await flagService.getCurrentRelease();
  const edition = system.getEdition();

  const blocks = await blockMetadataService.list({
    includeHidden: false,
    projectId,
    release,
    edition,
  });

  return blocks.find((block) => block.auth?.authProviderKey === authProviderKey)
    ?.auth;
}

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
