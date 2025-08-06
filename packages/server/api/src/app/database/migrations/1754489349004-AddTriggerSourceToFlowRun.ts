import { FlowRunTriggerSource } from '@openops/shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTriggerSourceToFlowRun1754489349005
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flow_run 
      ADD COLUMN IF NOT EXISTS "triggerSource" varchar;

      UPDATE flow_run 
      SET "triggerSource" = '${FlowRunTriggerSource.TRIGGERED}'
      WHERE "triggerSource" IS NULL;

      ALTER TABLE flow_run 
      ALTER COLUMN "triggerSource" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flow_run DROP COLUMN IF EXISTS "triggerSource";
    `);
  }
}
