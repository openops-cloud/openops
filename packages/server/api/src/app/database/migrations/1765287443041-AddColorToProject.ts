import { PROJECT_COLORS } from '@openops/shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColorToProject1765287443041 implements MigrationInterface {
  name = 'AddColorToProject1765287443041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "project"
      ADD COLUMN IF NOT EXISTS "color" character varying;
    `);

    const projects = await queryRunner.query(`
      SELECT "id" FROM "project" WHERE "color" IS NULL ORDER BY "created" ASC;
    `);

    for (let i = 0; i < projects.length; i++) {
      const color = PROJECT_COLORS[i % PROJECT_COLORS.length];
      await queryRunner.query(
        `UPDATE "project" SET "color" = $1 WHERE "id" = $2;`,
        [color, projects[i].id],
      );
    }

    await queryRunner.query(`
      ALTER TABLE "project"
      ALTER COLUMN "color" SET NOT NULL;
    `);
  }

  public async down(_: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
