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
        "refresh_token" character varying NOT NULL,
        "principal" jsonb NOT NULL,
        "is_revoked" boolean NOT NULL DEFAULT false,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "expirationTime" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_refresh_token_id" PRIMARY KEY ("id"),
        CONSTRAINT "fk_refresh_token_user_id" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_refresh_token_project_id" FOREIGN KEY ("projectId") REFERENCES "project" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_refresh_token_project_id_and_client" ON "refresh_token" ("projectId", "client")
    `);

    logger.info('CreateRefreshTokenTable1766579857000: completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "refresh_token"`);
  }
}
