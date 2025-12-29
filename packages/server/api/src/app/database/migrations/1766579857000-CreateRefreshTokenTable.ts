import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokenTable1766579857000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('CreateRefreshTokenTable1766579857000: starting');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_token" (
        "id" character varying(21) NOT NULL,
        "created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "projectId" character varying(21) NOT NULL,
        "userId" character varying(21) NOT NULL,
        "client" character varying NOT NULL,
        "refreshToken" character varying NOT NULL,
        "principal" jsonb NOT NULL,
        "isRevoked" boolean NOT NULL DEFAULT false,
        "revokedAt" TIMESTAMP WITH TIME ZONE,
        "expirationTime" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_refresh_token_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_refresh_token" UNIQUE ("refreshToken"),
        CONSTRAINT "fk_refresh_token_user_id" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_refresh_token_project_id" FOREIGN KEY ("projectId") REFERENCES "project" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_refresh_token_project_id_and_client" ON "refresh_token" ("projectId", "client")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_refresh_token_token_project_user_client_active" ON "refresh_token" ("refreshToken", "projectId", "userId", "client") WHERE "isRevoked" = false
    `);

    logger.info('CreateRefreshTokenTable1766579857000: completed');
  }

  public async down(_: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
