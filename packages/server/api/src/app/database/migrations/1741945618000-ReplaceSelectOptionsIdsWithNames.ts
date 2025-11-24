/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getTableFields,
  SelectOpenOpsField,
  TablesServerContext,
} from '@openops/common';
import { AppSystemProp, logger, system } from '@openops/server-shared';
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

    const templates = await queryRunner.query(
      `SELECT "id", "template" FROM "flow_template" WHERE "minSupportedVersion" = $1`,
      ['0.1.8'],
    );

    const user = await queryRunner.query(
      `SELECT * FROM "user" WHERE "email" = $1`,
      [system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_EMAIL)],
    );
    const project = await queryRunner.query(
      `SELECT * FROM "project" WHERE "ownerId" = $1`,
      [user.id],
    );
    const tablesServerContext: TablesServerContext = {
      tablesDatabaseId: project.tablesDatabaseId,
      tablesDatabaseToken: project.tablesDatabaseToken,
    };

    await updateRecords(
      queryRunner,
      workflows,
      'flow_version',
      tablesServerContext,
    );
    await updateRecords(
      queryRunner,
      templates,
      'flow_template',
      tablesServerContext,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}

async function updateRecords(
  queryRunner: QueryRunner,
  records: { id: string; trigger?: any; template?: any }[],
  tableName: string,
  tablesServerContext: TablesServerContext,
) {
  for (const record of records) {
    const jsonData = await updateJsonObject(
      record.trigger ?? record.template,
      tablesServerContext,
    );

    await queryRunner.query(
      `UPDATE "${tableName}" SET "${
        record.trigger ? 'trigger' : 'template'
      }" = $1 WHERE "id" = $2`,
      [jsonData, record.id],
    );
  }
}

const getFieldsFromCache = async (
  tableName: string,
  tablesServerContext: TablesServerContext,
) => {
  if (mappingOfSelectOptionsIdToValuesInEveryTable.has(tableName)) {
    const cachedFields =
      mappingOfSelectOptionsIdToValuesInEveryTable.get(tableName);

    return cachedFields;
  }

  let fields: SelectOpenOpsField[] = [];

  try {
    fields = (await getTableFields(
      tableName,
      tablesServerContext,
    )) as SelectOpenOpsField[];
  } catch (e) {
    logger.error(`Failed to get fields for table ${tableName}`, e);
  }

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

async function updateJsonObject(
  obj: any,
  tablesServerContext: TablesServerContext,
): Promise<any> {
  if (!obj || typeof obj !== 'object') return obj;

  if (obj.input?.tableName) {
    const fields = await getFieldsFromCache(
      obj.input.tableName,
      tablesServerContext,
    );

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
      for (const item of obj[key]) {
        obj[key] = await updateJsonObject(item, tablesServerContext);
      }
    } else if (typeof obj[key] === 'object') {
      obj[key] = await updateJsonObject(obj[key], tablesServerContext);
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
