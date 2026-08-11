import { findAllBlocksDirectoryInSource } from './utils/block-script-utils';
import { packagePrePublishChecks } from './utils/package-pre-publish-checks';

const main = async () => {
  const blocksMetadata = await findAllBlocksDirectoryInSource()

  const packages = [
    ...blocksMetadata,
    'packages/blocks/framework',
    'packages/shared',
    'packages/blocks/common',
  ]

  const validationResults = packages.map(p => packagePrePublishChecks(p))

  Promise.all(validationResults);
}

main();
