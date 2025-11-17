import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTablesTokenToProject1763131154284
  implements MigrationInterface
{
  name = 'AddTablesTokenToProject1763131154284';

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
