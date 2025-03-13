/* eslint-disable @typescript-eslint/no-explicit-any */
import { getTableFields, SelectOpenOpsField } from '@openops/common';
import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

const mappingOfSelectOptionsIdToValuesInEveryTable = new Map<
  string,
  Map<string, Map<number, string>>
>();

export class testfsdasssssdasd1741636646001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const workflows = await queryRunner.query(
      'SELECT "id", "trigger" FROM "flow_version"',
    );
    const templates = await queryRunner.query(
      'SELECT "id", "template" FROM "flow_template" where "minSupportedVersion" = "0.1.8"',
    );

    if (!workflows.length && !templates.length) return;

    await updateRecords(queryRunner, workflows, 'flow_version');
    await updateRecords(queryRunner, templates, 'flow_template');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}

async function updateRecords(
  queryRunner: QueryRunner,
  records: { id: string; trigger?: any; template?: any }[],
  tableName: string,
) {
  for (const record of records) {
    const jsonData = await updateJsonObject(record.trigger ?? record.template);
    await queryRunner.query(
      `UPDATE "${tableName}" SET "${
        record.trigger ? 'trigger' : 'template'
      }" = $1 WHERE "id" = $2`,
      [jsonData, record.id],
    );
  }
}

const getFieldsFromCache = async (tableName: string) => {
  if (mappingOfSelectOptionsIdToValuesInEveryTable.has(tableName)) {
    return mappingOfSelectOptionsIdToValuesInEveryTable.get(tableName);
  }
  const fields = (await getTableFields(tableName)) as SelectOpenOpsField[];
  const fieldMaps = new Map<string, Map<number, string>>();
  fields.forEach((field) => {
    if (field.select_options) {
      fieldMaps.set(
        field.name,
        new Map(
          field.select_options.map((option) => [option.id, option.value]),
        ),
      );
    }
  });
  mappingOfSelectOptionsIdToValuesInEveryTable.set(tableName, fieldMaps);
  return fieldMaps;
};

async function updateJsonObject(obj: any): Promise<any> {
  if (!obj || typeof obj !== 'object') return obj;

  if (obj.input?.tableName) {
    const fields = await getFieldsFromCache(obj.input.tableName);

    obj.input.fieldsProperties?.fieldsProperties?.forEach((field: any) => {
      updateFieldValue(field, fields!.get(field.name));
    });
  }

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      obj[key] = Array.isArray(obj[key])
        ? obj[key].map(async (item: any) => updateJsonObject(item))
        : await updateJsonObject(obj[key]);
    }
  }

  return obj;
}

function updateFieldValue(field: any, fieldMap?: Map<number, string>) {
  if (!fieldMap) return;

  const optionValue = fieldMap.get(field.newFieldValue?.newFieldValue);
  if (optionValue) {
    field.newFieldValue.newFieldValue = optionValue;
  }
}
