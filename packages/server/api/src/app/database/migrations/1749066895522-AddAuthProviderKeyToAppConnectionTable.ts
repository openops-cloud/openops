import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthProviderKeyToAppConnectionTable1749066895522
  implements MigrationInterface
{
  name = 'AddAuthProviderKeyToAppConnectionTable1749066895522';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "app_connection"
      ADD COLUMN IF NOT EXISTS "authProviderKey" varchar NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "app_connection"
      DROP COLUMN IF EXISTS "provider";
    `);
  }

  public async down(_: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
