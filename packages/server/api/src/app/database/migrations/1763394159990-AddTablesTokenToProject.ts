import { authenticateUserInOpenOpsTables } from '@openops/common';
import { AppSystemProp, encryptUtils, system } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { openopsTables } from '../../openops-tables';

export class AddTablesDatabaseTokenToProject1763394159990
  implements MigrationInterface
{
  name = 'AddTablesDatabaseTokenToProject1763394159990';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "project"
      DROP COLUMN IF EXISTS "tablesToken";
    `);

    await queryRunner.query(`
      ALTER TABLE "project"
      ADD COLUMN IF NOT EXISTS "tablesDatabaseToken" jsonb
    `);

    await createTokensForExistingProjects(queryRunner);

    await queryRunner.query(`
      ALTER TABLE "project"
      ALTER COLUMN "tablesDatabaseToken" SET NOT NULL
    `);
  }

  public async down(_: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}

async function createTokensForExistingProjects(
  queryRunner: QueryRunner,
): Promise<void> {
  const projects = await queryRunner.query(
    'SELECT "id", "tablesWorkspaceId" FROM "project"',
  );

  if (projects.length === 0) {
    return;
  }

  const adminEmail = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_EMAIL);
  const password = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_PASSWORD);
  const { token } = await authenticateUserInOpenOpsTables(adminEmail, password);
  for (const record of projects) {
    const newToken = await openopsTables.createDatabaseToken(
      record.tablesWorkspaceId,
      token,
    );
    const encryptTablesToken = encryptUtils.encryptString(newToken.key);

    await queryRunner.query(
      `UPDATE "project" SET "tablesDatabaseToken" = $1 WHERE "id" = $2`,
      [encryptTablesToken, record.id],
    );
  }
}
