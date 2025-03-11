import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVersionToTemplates1741636646000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddVersionToTemplates1741636646000: starting');

    await queryRunner.query(`
      ALTER TABLE "flow_template"
      ADD COLUMN "minSupportedVersion" TEXT NULL,
      ADD COLUMN "maxSupportedVersion" TEXT NULL;
    `);

    await queryRunner.query(`
      INSERT INTO flow_template (
        name,
        description,
        type,
        tags,
        services,
        domains,
        pieces,
        template,
        "projectId",
        "organizationId",
        "isSample",
        "minSupportedVersion",
        "maxSupportedVersion"
      )
      SELECT
        name,
        description,
        type,
        tags,
        services,
        domains,
        pieces,
        template,
        "projectId",
        "organizationId",
        "isSample",
        '0.1.8' AS "minSupportedVersion",
        "maxSupportedVersion"
      FROM flow_template;
      `);

    const records = await queryRunner.query(`
        SELECT "id", "template"
        FROM "flow_template"
        WHERE "minSupportedVersion" = '0.1.8';
    `);

    for (const record of records) {
      let jsonData = record.template;

      jsonData = this.addBlockToFlowJson(jsonData);

      await queryRunner.query(
        'UPDATE "flow_template" SET "template" = $1 WHERE "id" = $2;',
        [jsonData, record.id],
      );
    }

    logger.info('AddVersionToTemplates1741636646000: finished');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Not implemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private addBlockToFlowJson(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (obj.type == 'PIECE_TRIGGER' || obj.type == 'BLOCK_TRIGGER') {
      obj.type = 'TRIGGER';
    }
    if (obj.type == 'PIECE') {
      obj.type = 'BLOCK';
    }

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'object') {
          if (Array.isArray(obj[key])) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            obj[key] = obj[key].map((item: any) =>
              this.addBlockToFlowJson(item),
            );
          } else {
            obj[key] = this.addBlockToFlowJson(obj[key]);
          }
        }
      }
    }

    return obj;
  }
}
