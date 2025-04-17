import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectIdToProviderConstraintForAiConfig1744904465001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info(
      'AddProjectIdToProviderConstraintForAiConfig1744904465001: starting',
    );

    await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ai_config_projectId_provider"
        ON "ai_config" ("projectId", "provider");
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Not implemented');
  }
}
