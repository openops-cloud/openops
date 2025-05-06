import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlowStepTestOutputTable1746454781866
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddFlowStepTestOutputTable1746454781866: starting');

    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "flow_step_test_output" (
          "id" character varying(21) NOT NULL,
          "created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "stepId" character varying(21) NOT NULL,
          "flowVersionId" character varying(21) NOT NULL,
          "output" bytea NOT NULL,
          CONSTRAINT "PK_flow_step_test_output_id" PRIMARY KEY ("id")
        );
      `);

    await queryRunner.query(`
        ALTER TABLE "flow_step_test_output"
        ADD CONSTRAINT "FK_flow_step_test_output_flow_version" FOREIGN KEY ("flowVersionId")
        REFERENCES "flow_version"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
      `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_flow_step_test_output_step_id_flow_version_id"
      ON "flow_step_test_output" ("stepId", "flowVersionId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Not implemented');
  }
}
