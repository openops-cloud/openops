import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviderToAppConnectionTable1748356358053
  implements MigrationInterface
{
  name = 'AddProviderToAppConnectionTable1748356358053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "app_connection"
      ADD COLUMN IF NOT EXISTS "provider" varchar NULL;
    `);
  }

  public async down(_: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
