import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIntegrationAuthorizationTable1766579857000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('CreateIntegrationAuthorizationTable1766579857000: starting');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "integration_authorization" (
        "id" character varying(21) NOT NULL,
        "created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId" character varying(21) NOT NULL,
        "projectId" character varying(21) NOT NULL,
        "organizationId" character varying(21) NOT NULL,
        "token" jsonb NOT NULL,
        "integrationName" character varying NOT NULL,
        "isRevoked" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_integration_authorization_id" PRIMARY KEY ("id"),
        CONSTRAINT "fk_integration_authorization_user_id" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_integration_authorization_project_id" FOREIGN KEY ("projectId") REFERENCES "project" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_integration_authorization_organization_id" FOREIGN KEY ("organizationId") REFERENCES "organization" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_integration_authorization_project_id_and_integration_name" ON "integration_authorization" ("projectId", "integrationName")
    `);

    logger.info('CreateIntegrationAuthorizationTable1766579857000: completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "integration_authorization"`);
  }
}
