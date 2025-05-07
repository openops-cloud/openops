/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from '@openops/server-shared';
import { openOpsId } from '@openops/shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStepIdToExistingTemplates1746627735717
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddStepIdToExistingTemplates1746627735717: starting');

    const templates = await queryRunner.query(
      'SELECT "id", "template" FROM "flow_template"',
    );

    await updateRecords(queryRunner, templates, 'flow_template');

    logger.info('AddStepIdToExistingTemplates1746627735717: completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}

async function updateRecords(
  queryRunner: QueryRunner,
  records: { id: string; template: any }[],
  tableName: string,
): Promise<void> {
  for (const record of records) {
    const jsonData = record.template;

    const updatedJson = await updateJsonObject(jsonData);

    await queryRunner.query(
      `UPDATE "${tableName}" SET "template" = $1 WHERE "id" = $2`,
      [updatedJson, record.id],
    );
  }
}

async function updateJsonObject(obj: any): Promise<any> {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (obj.name && obj.type && !obj.id) {
    obj.id = openOpsId();
  }

  for (const key of Object.keys(obj)) {
    if (Array.isArray(obj[key])) {
      obj[key] = await Promise.all(obj[key].map(updateJsonObject));
    } else if (typeof obj[key] === 'object') {
      obj[key] = await updateJsonObject(obj[key]);
    }
  }

  return obj;
}
