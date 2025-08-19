import { logger } from '@openops/server-shared';
import { FlowType } from '@openops/shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTypeColumnToFlowAndFlowVersion1755607336738
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddTypeColumnToFlowAndFlowVersion1755607336738: starting');

    await addTypeColumnToTable(queryRunner, 'flow');
    await addTypeColumnToTable(queryRunner, 'flow_version');

    logger.info('AddTypeColumnToFlowAndFlowVersion1755607336738: finished');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}

async function addTypeColumnToTable(
  queryRunner: QueryRunner,
  table: string,
): Promise<void> {
  await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD COLUMN "type" character varying
      `);

  await queryRunner.query(`
        UPDATE "${table}"
        SET "type" = '${FlowType.FLOW}'
        WHERE "type" IS NULL
      `);

  await queryRunner.query(`
        ALTER TABLE "${table}"
        ALTER COLUMN "type" SET NOT NULL,
        ALTER COLUMN "type" SET DEFAULT '${FlowType.FLOW}'
      `);
}
