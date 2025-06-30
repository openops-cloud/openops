import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInputToTriggerEventTable1750933522145
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddInputToTriggerEventTable1750933522145: starting');

    await queryRunner.query(`
      ALTER TABLE "trigger_event"
      ADD COLUMN IF NOT EXISTS "input" jsonb;
    `);

    logger.info('AddInputToTriggerEventTable1750933522145: completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
