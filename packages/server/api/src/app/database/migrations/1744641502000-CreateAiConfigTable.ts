import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAiConfigTable1744641502000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('CreateAiConfigTable1744641502000: starting');

    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "ai_config" (
          "id" character varying(21) NOT NULL,
          "created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "projectId" character varying(21) NOT NULL,
          "provider" character varying NOT NULL,
          "model" character varying NOT NULL,
          "apiKey" character varying NOT NULL,
          "modelSettings" jsonb,
          "enabled" boolean,
          CONSTRAINT "PK_ai_config_id" PRIMARY KEY ("id")
        );
      `);

    await queryRunner.query(`
        ALTER TABLE "ai_config"
        ADD CONSTRAINT "FK_ai_config_project" FOREIGN KEY ("projectId")
        REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
      `);

    await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_ai_config_projectId" ON "ai_config" ("projectId");
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Not implemented');
  }
}
