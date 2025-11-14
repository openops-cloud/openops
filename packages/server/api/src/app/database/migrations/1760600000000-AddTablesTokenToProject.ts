import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTablesTokenToProject1760600000000
  implements MigrationInterface
{
  name = 'AddTablesTokenToProject1760600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "project"
      ADD COLUMN IF NOT EXISTS "tablesToken" character varying NULL
    `);
  }

  public async down(_: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
