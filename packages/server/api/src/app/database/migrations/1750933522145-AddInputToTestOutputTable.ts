import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInputToTestOutputTable1750933522145
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddInputToTestOutputTable1750933522145: starting');

    await queryRunner.query(`
      ALTER TABLE "flow_step_test_output"
      ADD COLUMN IF NOT EXISTS "input" bytea NOT NULL DEFAULT ''::bytea;
    `);

    logger.info('AddInputToTestOutputTable1750933522145: completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
