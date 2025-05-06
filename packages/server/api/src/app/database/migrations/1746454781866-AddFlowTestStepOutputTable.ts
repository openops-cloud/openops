import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlowTestStepOutputTable1746454781866
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddFlowTestStepOutputTable1746454781866: starting');

    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "flow_test_step_output" (
          "id" character varying(21) NOT NULL,
          "created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "step_id" character varying(21) NOT NULL,
          "flow_version_id" character varying(21) NOT NULL,
          "output" bytea NOT NULL,
          CONSTRAINT "PK_flow_test_step_output_id" PRIMARY KEY ("id")
        );
      `);

    await queryRunner.query(`
        ALTER TABLE "flow_test_step_output"
        ADD CONSTRAINT "FK_flow_test_step_output_flow_version" FOREIGN KEY ("flow_version_id")
        REFERENCES "flow_version"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
      `);

    await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_flow_test_step_output_step_id" ON "flow_test_step_output" ("step_id");
      `);

    await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_flow_test_step_output_flow_version_id" ON "flow_test_step_output" ("flow_version_id");
      `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_flow_test_step_output_step_id_flow_version_id"
      ON "flow_test_step_output" ("step_id", "flow_version_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Not implemented');
  }
}
