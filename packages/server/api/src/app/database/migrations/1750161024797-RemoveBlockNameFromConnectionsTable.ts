import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveBlockNameFromConnectionsTable1750161024797
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('RemoveBlockNameFromConnectionsTable1750161024797: starting');

    await queryRunner.query(`
      ALTER TABLE "app_connection"
      DROP COLUMN IF EXISTS "pieceName";
    `);

    await queryRunner.query(`
      ALTER TABLE "app_connection"
      DROP COLUMN IF EXISTS "blockName";
    `);

    logger.info('RemoveBlockNameFromConnectionsTable1750161024797: completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
