import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsWorkflowToFlowTable1756298583000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddIsWorkflowToFlowTable1756298583000: starting');

    await queryRunner.query(`
      ALTER TABLE "flow"
      ADD COLUMN IF NOT EXISTS "isWorkflow" boolean NOT NULL DEFAULT true;
    `);

    logger.info('AddIsWorkflowToFlowTable1756298583000: completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
