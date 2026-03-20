import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLastRunIdFromBenchmark1772449919844
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('DropLastRunIdFromBenchmark1772449919844: starting');

    await queryRunner.query(`
      ALTER TABLE "benchmark" DROP COLUMN IF EXISTS "lastRunId";
    `);

    logger.info('DropLastRunIdFromBenchmark1772449919844: completed');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
