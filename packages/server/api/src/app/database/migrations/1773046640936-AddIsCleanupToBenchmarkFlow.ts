import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsCleanupToBenchmarkFlow1773046640936
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddIsCleanupToBenchmarkFlow1773046640936: starting');

    await queryRunner.query(`
      ALTER TABLE "benchmark_flow"
      ADD COLUMN IF NOT EXISTS "isCleanup" boolean NOT NULL DEFAULT false;
    `);

    logger.info('AddIsCleanupToBenchmarkFlow1773046640936: completed');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
