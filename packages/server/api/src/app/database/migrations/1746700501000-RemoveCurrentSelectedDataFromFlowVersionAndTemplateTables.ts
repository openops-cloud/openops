/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from '@openops/server-shared';
import { openOpsId } from '@openops/shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCurrentSelectedDataFromFlowVersionAndTemplateTables1746700501000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info(
      'RemoveCurrentSelectedDataFromFlowVersionAndTemplateTables1746700501000: starting',
    );

    const templates = await queryRunner.query(
      'SELECT "id", "template" FROM "flow_template"',
    );
    await updateRecordsTemplates(queryRunner, templates, 'flow_template');

    const workflows = await queryRunner.query(
      'SELECT "id", "trigger" FROM "flow_version"',
    );
    await updateRecordsFlowVersion(queryRunner, workflows, 'flow_version');

    logger.info(
      'RemoveCurrentSelectedDataFromFlowVersionAndTemplateTables1746700501000: completed',
    );
  }

  public async down(): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}

async function updateRecordsTemplates(
  queryRunner: QueryRunner,
  records: { id: string; template: any }[],
  tableName: string,
): Promise<void> {
  for (const record of records) {
    const jsonData = record.template;

    const updatedJson = await stripCurrentSelectedDataFromJson(jsonData);

    await queryRunner.query(
      `UPDATE "${tableName}" SET "template" = $1 WHERE "id" = $2`,
      [updatedJson, record.id],
    );
  }
}

async function updateRecordsFlowVersion(
  queryRunner: QueryRunner,
  records: { id: string; trigger?: any; template?: any }[],
  tableName: string,
): Promise<void> {
  for (const record of records) {
    const jsonData = record.trigger ?? record.template;

    const updatedJson = await stripCurrentSelectedDataFromJson(jsonData);

    await queryRunner.query(
      `UPDATE "${tableName}" SET "trigger" = $1 WHERE "id" = $2`,
      [updatedJson, record.id],
    );
  }
}

async function stripCurrentSelectedDataFromJson(obj: any): Promise<any> {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (obj.name && !obj.id) {
    obj.id = openOpsId();
  }

  if (obj.settings?.inputUiInfo?.currentSelectedData !== undefined) {
    delete obj.settings.inputUiInfo.currentSelectedData;
  }

  for (const key of Object.keys(obj)) {
    if (Array.isArray(obj[key])) {
      obj[key] = await Promise.all(
        obj[key].map((item: any) => stripCurrentSelectedDataFromJson(item)),
      );
    } else if (typeof obj[key] === 'object') {
      obj[key] = await stripCurrentSelectedDataFromJson(obj[key]);
    }
  }

  return obj;
}
