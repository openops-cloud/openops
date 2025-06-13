import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetBlockNameAsNullableInConnectionsTable1749809813762
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info(
      'SetBlockNameAsNullableInConnectionsTable1749809813762: starting',
    );

    await queryRunner.query(`
      ALTER TABLE "app_connection"
      ALTER COLUMN "blockName" SET NULL
    `);

    logger.info(
      'SetBlockNameAsNullableInConnectionsTable1749809813762: completed',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
