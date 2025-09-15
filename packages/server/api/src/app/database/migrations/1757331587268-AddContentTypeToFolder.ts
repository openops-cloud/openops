import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContentTypeToFolder1757331587268 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddContentTypeToFolder1757331587268: starting');

    await queryRunner.query(`
      ALTER TABLE "folder"
      ADD COLUMN IF NOT EXISTS "contentType" varchar;
    `);

    await queryRunner.query(`
      UPDATE "folder" 
      SET "contentType" = 'WORKFLOW'
      WHERE "contentType" IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "folder"
      ALTER COLUMN "contentType" SET NOT NULL;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_folder_project_id_display_name;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_folder_project_id_content_type_display_name
      ON folder ("projectId", "contentType", "displayName");
    `);

    logger.info('AddContentTypeToFolder1757331587268: completed');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
