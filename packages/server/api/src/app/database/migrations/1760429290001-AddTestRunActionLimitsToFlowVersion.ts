import { logger } from '@openops/server-shared';
import { Trigger } from '@openops/shared';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { calculateTestRunActionLimits } from '../../flows/flow-version/test-run-action-limits-calculator';

export class AddTestRunActionLimitsToFlowVersion1760429290001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddTestRunActionLimitsToFlowVersion1760429290001: starting');

    await queryRunner.query(`
      ALTER TABLE "flow_version"
      ADD COLUMN IF NOT EXISTS "testRunActionLimits" jsonb NOT NULL
    `);

    const records: Array<{ id: string; trigger: Trigger | null }> =
      await queryRunner.query('SELECT "id", "trigger" FROM "flow_version"');

    for (const record of records) {
      const testRunActionLimits = await calculateTestRunActionLimits(
        record.trigger,
      );

      await queryRunner.query(
        `UPDATE "flow_version" SET "testRunActionLimits" = $1 WHERE "id" = $2`,
        [JSON.stringify(testRunActionLimits), record.id],
      );
    }

    logger.info('AddTestRunActionLimitsToFlowVersion1760429290001: completed');
  }

  public async down(): Promise<void> {
    throw new Error('Not implemented');
  }
}
