import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColumnForStartupTemplates1741016911542 implements MigrationInterface {
  name = 'AddColumnForStartupTemplates1741016911542';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "flow_template"
            ADD "isGettingStarted" boolean NOT NULL DEFAULT false
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Not implemented');
  }
}
