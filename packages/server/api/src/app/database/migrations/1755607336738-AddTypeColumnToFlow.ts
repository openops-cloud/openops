import { logger } from '@openops/server-shared';
import { FlowType } from '@openops/shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTypeColumnToFlow1755607336738 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddTypeColumnToFlow1755607336738: starting');

    await queryRunner.query(`
        ALTER TABLE "flow"
        ADD COLUMN "type" character varying
      `);

    await queryRunner.query(`
        UPDATE "flow"
        SET "type" = '${FlowType.FLOW}'
        WHERE "type" IS NULL
      `);

    await queryRunner.query(`
        ALTER TABLE "flow"
        ALTER COLUMN "type" SET NOT NULL'
      `);

    logger.info('AddTypeColumnToFlowAndFlowVersion1755607336738: finished');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
