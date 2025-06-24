import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMcpConfigTable1749644220382 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('CreateMcpConfigTable1749644220382: starting');

    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "mcp_config" (
          "id" character varying(21) NOT NULL,
          "created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "projectId" character varying(21) NOT NULL,
          "name" character varying(50) NOT NULL,
          "config" jsonb DEFAULT '{}',
          CONSTRAINT "PK_mcp_config_id" PRIMARY KEY ("id")
        );
      `);

    await queryRunner.query(`
        ALTER TABLE "mcp_config"
        ADD CONSTRAINT "FK_mcp_config_project" FOREIGN KEY ("projectId")
        REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
      `);

    await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_mcp_config_project_name" ON "mcp_config" ("projectId", "name");
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Not implemented');
  }
}
