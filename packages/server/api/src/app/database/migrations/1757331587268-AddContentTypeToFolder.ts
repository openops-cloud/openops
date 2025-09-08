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

    logger.info('AddContentTypeToFolder1757331587268: completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
