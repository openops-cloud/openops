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
          "awsCost" jsonb DEFAULT '{"enabled": false, "connectionName": ""}',
          CONSTRAINT "PK_mcp_config_id" PRIMARY KEY ("id")
        );
      `);

    await queryRunner.query(`
        ALTER TABLE "mcp_config"
        ADD CONSTRAINT "FK_mcp_config_project" FOREIGN KEY ("projectId")
        REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
      `);

    await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_mcp_config_projectId" ON "mcp_config" ("projectId");
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    logger.info('CreateMcpConfigTable1749644220382: down starting');

    await queryRunner.query(`DROP TABLE IF EXISTS "mcp_config";`);

    logger.info('CreateMcpConfigTable1749644220382: down finished');
  }
}
