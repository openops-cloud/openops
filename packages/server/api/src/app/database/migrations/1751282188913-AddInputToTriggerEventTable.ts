import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInputToTriggerEventTable1751282188913
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddInputToTriggerEventTable1751282188913: starting');

    await queryRunner.query(`
      ALTER TABLE "trigger_event"
      ADD COLUMN IF NOT EXISTS "input" jsonb;
    `);

    logger.info('AddInputToTriggerEventTable1751282188913: completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
