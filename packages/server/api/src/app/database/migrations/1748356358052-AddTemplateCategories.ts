import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateCategories1748356358052 implements MigrationInterface {
  name = 'AddTemplateCategories1748356358052';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "flow_template"
            ADD "categories" jsonb DEFAULT '[]'
        `);
  }

  public async down(_: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
