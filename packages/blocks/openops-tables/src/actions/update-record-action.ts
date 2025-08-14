import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import {
  authenticateDefaultUserInOpenOpsTables,
  getFields,
  getPrimaryKeyFieldFromFields,
  getPropertyFromField,
  getTableFields,
  getTableIdByTableName,
  OpenOpsField,
  openopsTablesDropdownProperty,
  upsertRow,
} from '@openops/common';
import { cacheWrapper } from '@openops/server-shared';
import { convertToStringWithValidation, isEmpty } from '@openops/shared';

export const updateRecordAction = createAction({
  auth: BlockAuth.None(),
  name: 'update_record',
  description: 'Add or update a record in an OpenOps table.',
  displayName: 'Add or Update Record',
  props: {
    tableName: openopsTablesDropdownProperty(),
    rowPrimaryKey: Property.DynamicProperties({
      displayName: 'Row Primary Key',
      description:
        'The primary key value of the row to update. If the row does not exist, a new row will be created.',
      required: true,
      refreshers: ['tableName'],
      props: async ({ tableName }) => {
        if (!tableName) {
          return {};
        }

        const fields = await getTableFields(tableName as unknown as string);

        const primaryKeyField = getPrimaryKeyFieldFromFields(fields);

        const properties: { [key: string]: any } = {};
        properties['rowPrimaryKey'] = primaryKeyField.read_only
          ? Property.ShortText({
              displayName: 'Primary Key Value',
              required: false,
              description:
                'The primary key value of the row to update. If left empty, a new row will be created.',
            })
          : Property.ShortText({
              displayName: 'Primary Key Value',
              required: true,
              description:
                'The primary key value of the row to update. If the row does not exist, a new row will be created.',
            });

        return properties;
      },
    }),
    fieldsProperties: Property.DynamicProperties({
      displayName: '',
      description: '',
      required: true,
      refreshers: ['tableName'],
      props: async ({ tableName }) => {
        if (!tableName) {
          return {};
        }

        const tableFields = await getTableFields(
          tableName as unknown as string,
        );

        const properties: { [key: string]: any } = {};
        properties['fieldsProperties'] = Property.Array({
          displayName: 'Fields to update',
          required: true,
          properties: {
            fieldName: Property.StaticDropdown<string>({
              displayName: 'Field name',
              required: true,
              options: {
                options: tableFields
                  .filter((f) => !f.read_only && !f.primary)
                  .map((f) => ({ label: f.name, value: f.name })),
              },
            }),
            newFieldValue: Property.DynamicProperties({
              displayName: 'New field value',
              required: true,
              refreshers: ['fieldName'],
              props: async ({ fieldName }) => {
                const innerProps: { [key: string]: any } = {};
                const currentField = fieldName as unknown as string;
                if (!currentField) {
                  innerProps['newFieldValue'] = {};
                } else {
                  const openOpsField = tableFields.find(
                    (f) => f.name === currentField,
                  );

                  innerProps['newFieldValue'] = openOpsField
                    ? getPropertyFromField(openOpsField, true)
                    : {};
                }
                return innerProps;
              },
            }),
          },
        });
        return properties;
      },
    }),
    roundToFieldPrecision: Property.Checkbox({
      displayName: 'Round Numeric Values',
      description:
        'When ON, numeric inputs are rounded to the number of decimals specified by the destination field in the table. When OFF, inserts fail if inputs have more decimals than the field allows.',
      required: false,
      defaultValue: true,
    }),
  },
  async run(context) {
    const { rowPrimaryKey, fieldsProperties } = context.propsValue;
    const tableName = context.propsValue.tableName as unknown as string;
    const roundToFieldPrecision =
      (context.propsValue.roundToFieldPrecision as boolean) ?? true;

    const tableCacheKey = `${context.run.id}-table-${tableName}`;
    const tableId = await cacheWrapper.getOrAdd(
      tableCacheKey,
      getTableIdByTableName,
      [tableName],
    );

    const { token } = await authenticateDefaultUserInOpenOpsTables();

    const fieldsCacheKey = `${context.run.id}-${tableId}-fields`;
    const tableFields = await cacheWrapper.getOrAdd(fieldsCacheKey, getFields, [
      tableId,
      token,
    ]);

    const fieldsToUpdate = mapFieldsToObject(
      tableName,
      tableFields,
      fieldsProperties,
      { roundToFieldPrecision },
    );

    const primaryKeyField = getPrimaryKeyFieldFromFields(tableFields);
    const primaryKeyValue = getPrimaryKey(rowPrimaryKey['rowPrimaryKey']);
    fieldsToUpdate[primaryKeyField.name] = primaryKeyValue;

    return await upsertRow({
      tableId: tableId,
      token: token,
      fields: fieldsToUpdate,
    });
  },
});

function getPrimaryKey(rowPrimaryKey: any): string | undefined {
  if (rowPrimaryKey === null || rowPrimaryKey === undefined) {
    return undefined;
  }

  const primaryKeyValue = convertToStringWithValidation(
    rowPrimaryKey,
    'The primary key should be a string',
  );

  return isEmpty(primaryKeyValue) ? undefined : primaryKeyValue;
}

function getFieldScale(field: OpenOpsField): number | undefined {
  const f = field as any;
  const s = f.number_decimal_places;

  return typeof s === 'number' ? s : undefined;
}

function roundToScale(value: any, scale: number): string | number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return value;
  const s = n.toFixed(scale);
  return scale === 0 ? Number(s) : s;
}

function hasMoreDecimalsThan(value: any, scale: number): boolean {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return false;
  const factor = Math.pow(10, scale);
  return Math.abs(n - Math.round(n * factor) / factor) > 1e-9;
}

function mapFieldsToObject(
  tableName: string,
  validColumns: OpenOpsField[],
  fieldsProperties: any,
  options: { roundToFieldPrecision: boolean },
): Record<string, any> {
  const byName = new Map(validColumns.map((field) => [field.name, field]));
  const updateFields =
    (fieldsProperties['fieldsProperties'] as unknown as {
      fieldName: string;
      newFieldValue: any;
    }[]) ?? [];

  const fieldsToUpdate: Record<string, any> = {};

  for (const { fieldName, newFieldValue } of updateFields) {
    const field = byName.get(fieldName);
    if (!field) {
      throw new Error(
        `Column ${fieldName} does not exist in table ${tableName}.`,
      );
    }

    const value = newFieldValue['newFieldValue'];

    const scale = getFieldScale(field);

    if (scale === undefined) {
      fieldsToUpdate[fieldName] = value;
      continue;
    }

    if (value == null || (typeof value === 'string' && value.trim() === '')) {
      fieldsToUpdate[fieldName] = value;
      continue;
    }

    if (options.roundToFieldPrecision) {
      fieldsToUpdate[fieldName] = roundToScale(value, scale);
    } else {
      if (hasMoreDecimalsThan(value, scale)) {
        throw new Error(
          `Field "${fieldName}" allows ${scale} decimal place(s); received ${value}. ` +
            `Enable "Round numeric values (to field precision)" or provide a value with at most ${scale} decimals.`,
        );
      }
      fieldsToUpdate[fieldName] = value;
    }
  }

  return fieldsToUpdate;
}
