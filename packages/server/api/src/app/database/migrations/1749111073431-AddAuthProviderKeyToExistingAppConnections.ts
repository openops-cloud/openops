import { fileBlocksUtils, logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthProviderKeyToExistingAppConnections1749111073431
  implements MigrationInterface
{
  name = 'AddAuthProviderKeyToExistingAppConnections1749111073431';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const providers = await getProvidersMapping();

    const records = await queryRunner.query(`
      SELECT "id", "blockName" FROM "app_connection"
    `);

    for (const record of records) {
      const blockName = record.blockName;
      const authProviderKey = providers[blockName];

      if (!authProviderKey) {
        const message = `The authentication provider for block ${blockName} was not found`;
        logger.error(message, {
          blockName,
        });

        throw new Error(message);
      }

      await queryRunner.query(
        'UPDATE "app_connection" SET "authProviderKey" = $1 WHERE "id" = $2',
        [authProviderKey, record.id],
      );
    }

    await queryRunner.query(`
      ALTER TABLE "app_connection"
      ALTER COLUMN "authProviderKey" SET NOT NULL
    `);
  }

  public async down(_: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}

async function getProvidersMapping(): Promise<Record<string, string>> {
  const blocks = await fileBlocksUtils.findAllBlocks();
  const blockMetadata: Record<string, string> = {};
  for (const block of blocks) {
    if (block.auth?.authProviderKey) {
      blockMetadata[block.name] = block.auth?.authProviderKey;
    }
  }
  return blockMetadata;
}
