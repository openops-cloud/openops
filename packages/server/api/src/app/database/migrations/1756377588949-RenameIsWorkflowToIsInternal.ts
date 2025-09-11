import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameIsWorkflowToIsInternal1756377588949
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('RenameIsWorkflowToIsInternal1756377588949: starting');

    await queryRunner.query(`
      ALTER TABLE "flow"
      ADD COLUMN IF NOT EXISTS "isInternal" boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      UPDATE "flow" 
      SET "isInternal" = false;
    `);

    await queryRunner.query(`
      ALTER TABLE "flow"
      DROP COLUMN IF EXISTS "isWorkflow";
    `);

    logger.info('RenameIsWorkflowToIsInternal1756377588949: completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
