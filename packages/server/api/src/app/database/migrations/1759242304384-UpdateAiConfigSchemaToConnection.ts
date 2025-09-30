import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAiConfigSchemaToConnection1759242304384
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('UpdateAiConfigSchemaToConnection1759242304384: starting');

    await queryRunner.query(`
      ALTER TABLE "ai_config"
      ADD COLUMN IF NOT EXISTS "connection" character varying;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'UQ_ai_config_projectId_provider'
        ) THEN
          EXECUTE 'DROP INDEX "UQ_ai_config_projectId_provider"';
        END IF;
      END$$;
    `);

    const columns = [
      'provider',
      'model',
      'apiKey',
      'providerSettings',
      'modelSettings',
    ];
    for (const col of columns) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'ai_config' AND column_name = '${col}'
          ) THEN
            EXECUTE 'ALTER TABLE "ai_config" DROP COLUMN "${col}"';
          END IF;
        END$$;
      `);
    }

    logger.info('UpdateAiConfigSchemaToConnection1759242304384: completed');
  }

  public async down(): Promise<void> {
    throw new Error('Not implemented');
  }
}
