import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveTablesWorkspaceIdFromOrganizationToProject1760500000000
  implements MigrationInterface
{
  name = 'MoveTablesWorkspaceIdFromOrganizationToProject1760500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "project"
      ADD COLUMN IF NOT EXISTS "tablesWorkspaceId" integer;
    `);

    // Migrate tablesWorkspaceId data from organization to project
    await queryRunner.query(`
      UPDATE "project"
      SET "tablesWorkspaceId" = "organization"."tablesWorkspaceId"
      FROM "organization"
      WHERE "project"."organizationId" = "organization"."id";
    `);

    await queryRunner.query(`
      ALTER TABLE "project"
      ALTER COLUMN "tablesWorkspaceId" SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "organization"
      DROP COLUMN IF EXISTS "tablesWorkspaceId";
    `);
  }

  public async down(_: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
