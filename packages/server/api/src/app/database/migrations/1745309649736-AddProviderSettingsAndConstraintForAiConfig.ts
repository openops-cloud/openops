import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviderSettingsAndConstraintForAiConfig1745309649736
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info(
      'AddProviderSettingsAndConstraintForAiConfig1745309649736: starting',
    );

    await queryRunner.query(`
      ALTER TABLE "ai_config"
      ADD COLUMN IF NOT EXISTS "providerSettings" jsonb;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ai_config_projectId_provider"
      ON "ai_config" ("projectId", "provider");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Not implemented');
  }
}
