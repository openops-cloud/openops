/* eslint-disable @typescript-eslint/no-explicit-any */
import { getTableFields, SelectOpenOpsField } from '@openops/common';
import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

const mappingOfSelectOptionsIdToValuesInEveryTable = new Map<
  string,
  Map<string, Map<number, string>>
>();

export class ReplaceSelectOptionsIdsWithNames1741945618000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const workflows = await queryRunner.query(
      'SELECT "id", "trigger" FROM "flow_version"',
    );
    logger.info(`Fetched ${workflows.length} workflows from flow_version`);

    const templates = await queryRunner.query(
      'SELECT "id", "template" FROM "flow_template"',
    );
    logger.info(`Fetched ${templates.length} templates from flow_template`);

    if (!workflows.length && !templates.length) {
      logger.info('No workflows or templates found. Exiting migration.');
      return;
    }

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
    const cachedFields =
      mappingOfSelectOptionsIdToValuesInEveryTable.get(tableName);

    return cachedFields;
  }
  const fields = (await getTableFields(tableName)) as SelectOpenOpsField[];

  const fieldMaps = new Map<string, Map<number, string>>();

  fields.forEach((field) => {
    if (field.select_options && field.select_options.length > 0) {
      const optionsMap = new Map(
        field.select_options.map((option) => [option.id, option.value]),
      );

      fieldMaps.set(field.name, optionsMap);
    }
  });

  mappingOfSelectOptionsIdToValuesInEveryTable.set(tableName, fieldMaps);

  return fieldMaps;
};

async function updateJsonObject(obj: any): Promise<any> {
  if (!obj || typeof obj !== 'object') return obj;

  if (obj.input?.tableName) {
    const fields = await getFieldsFromCache(obj.input.tableName);

    if (!fields) {
      return obj;
    }

    if (obj.input.fieldsProperties?.fieldsProperties) {
      for (const field of obj.input.fieldsProperties.fieldsProperties) {
        if (!field.fieldName) {
          continue;
        }

        updateFieldValue(field, fields.get(field.fieldName));
      }
    }
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

function updateFieldValue(field: any, fieldMap?: Map<number, string>) {
  if (!fieldMap || fieldMap.size === 0) {
    return;
  }

  const optionValue = fieldMap.get(field.newFieldValue?.newFieldValue);
  if (optionValue) {
    field.newFieldValue.newFieldValue = optionValue;
  }
}
