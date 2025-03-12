import { logger } from '@openops/server-shared';
import { openOpsId } from '@openops/shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVersionToTemplates1741636646000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddVersionToTemplates1741636646000: starting');

    await queryRunner.query(`
      ALTER TABLE "flow_template"
      ADD COLUMN "minSupportedVersion" TEXT NULL,
      ADD COLUMN "maxSupportedVersion" TEXT NULL;
    `);

    const templates = await queryRunner.query(`
      SELECT name,
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
             "blocks",
             "maxSupportedVersion"
      FROM flow_template;
    `);

    for (const template of templates) {
      const newId = openOpsId();

      await queryRunner.query(
        `INSERT INTO flow_template (
           id,
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
           "blocks",
           "minSupportedVersion",
           "maxSupportedVersion"
         )
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12, $13::jsonb, '0.1.8', $14);
        `,
        [
          newId,
          template.name,
          template.description,
          template.type,
          JSON.stringify(template.tags),
          JSON.stringify(template.services),
          JSON.stringify(template.domains),
          JSON.stringify(template.pieces),
          JSON.stringify(template.template),
          template.projectId,
          template.organizationId,
          template.isSample,
          JSON.stringify(template.blocks),
          template.maxSupportedVersion,
        ],
      );
    }

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
