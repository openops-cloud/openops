import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixFolderUniqueConstraint1776097737024
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('FixFolderUniqueConstraint1776097737024: starting');

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_folder_project_id_content_type_display_name;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_folder_project_id_display_name_content_type
        ON folder ("projectId", "displayName", "contentType")
        WHERE "parentFolderId" IS NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_folder_project_id_parent_display_name_content_type
        ON folder ("projectId", "parentFolderId", "displayName", "contentType")
        WHERE "parentFolderId" IS NOT NULL;
    `);

    logger.info('FixFolderUniqueConstraint1776097737024: completed');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
