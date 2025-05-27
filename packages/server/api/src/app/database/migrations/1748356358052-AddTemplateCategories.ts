import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateCategories1748356358052 implements MigrationInterface {
  name = 'AddTemplateCategories1748356358052';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "flow_template"
            ADD "categories" jsonb
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "flow_template" DROP COLUMN "categories"
        `);
  }
}
