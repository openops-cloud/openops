import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSuccessToFlowStepTestOutputTable1752487641303
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddSuccessToFlowStepTestOutputTable1752487641303: starting');

    await queryRunner.query(`
      ALTER TABLE "flow_step_test_output"
      ADD COLUMN IF NOT EXISTS "success" boolean NOT NULL DEFAULT true;
    `);

    logger.info('AddSuccessToFlowStepTestOutputTable1752487641303: completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
