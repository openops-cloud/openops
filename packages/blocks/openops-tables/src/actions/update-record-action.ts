import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import {
  getFields,
  getPrimaryKeyFieldFromFields,
  getPropertyFromField,
  getTableFields,
  getTableIdByTableName,
  OpenOpsField,
  openopsTablesDropdownProperty,
  resolveTokenProvider,
  TokenOrResolver,
  upsertRow,
} from '@openops/common';
import { cacheWrapper } from '@openops/server-shared';
import { convertToStringWithValidation, isEmpty } from '@openops/shared';

const FLOAT_COMPARISON_EPSILON = 1e-9;

export const updateRecordAction = createAction({
  auth: BlockAuth.None(),
  name: 'update_record',
  description: 'Add or update a record in an OpenOps table.',
  displayName: 'Add or Update Record',
  isWriteAction: true,
  props: {
    tableName: openopsTablesDropdownProperty(),
    rowPrimaryKey: Property.DynamicProperties({
      displayName: 'Row Primary Key',
      description:
        'The primary key value of the row to update. If the row does not exist, a new row will be created.',
      required: true,
      refreshers: ['tableName'],
      props: async ({ tableName }, context) => {
        if (!tableName) {
          return {};
        }

        const fields = await getTableFields(
          tableName as unknown as string,
          context.server,
        );

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
      props: async ({ tableName }, context) => {
        if (!tableName) {
          return {};
        }

        const tableFields = await getTableFields(
          tableName as unknown as string,
          context.server,
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
      defaultValue: false,
    }),
  },
  async run(context) {
    const { rowPrimaryKey, fieldsProperties } = context.propsValue;
    const tableName = context.propsValue.tableName as unknown as string;
    const roundToFieldPrecision =
      (context.propsValue.roundToFieldPrecision as boolean) ?? false;

    const tableCacheKey = `${context.run.id}-table-${tableName}`;
    const tableId = await cacheWrapper.getOrAdd(
      tableCacheKey,
      getTableIdByTableName,
      [tableName, context.server],
    );

    const fieldsCacheKey = `${context.run.id}-${tableId}-fields`;

    const tokenOrContext = await resolveTokenProvider(context.server);

    const tableFields = await cacheWrapper.getOrAdd<
      OpenOpsField[],
      [number, TokenOrResolver]
    >(fieldsCacheKey, getFields, [tableId, tokenOrContext]);

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
      fields: fieldsToUpdate,
      tokenOrContext,
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

function getFieldDecimalPlaces(field: OpenOpsField): number | undefined {
  const fieldObj = field as any;
  const decimalPlaces = fieldObj.number_decimal_places;

  return typeof decimalPlaces === 'number' ? decimalPlaces : undefined;
}

function formatDecimalPlaces(
  value: any,
  decimalPlaces: number,
): string | number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return value;
  const roundedValue = numericValue.toFixed(decimalPlaces);
  return decimalPlaces === 0 ? Number(roundedValue) : roundedValue;
}

function hasMoreDecimalsThan(value: any, decimalPlaces: number): boolean {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return false;
  const factor = Math.pow(10, decimalPlaces);
  return (
    Math.abs(numericValue - Math.round(numericValue * factor) / factor) >
    FLOAT_COMPARISON_EPSILON
  );
}

function mapFieldsToObject(
  tableName: string,
  validColumns: OpenOpsField[],
  fieldsProperties: any,
  options: { roundToFieldPrecision: boolean },
): Record<string, any> {
  const availableColumns: Record<string, OpenOpsField> = Object.fromEntries(
    validColumns.map((field) => [field.name, field]),
  );
  const updateFields =
    (fieldsProperties['fieldsProperties'] as unknown as {
      fieldName: string;
      newFieldValue: any;
    }[]) ?? [];

  const fieldsToUpdate: Record<string, any> = {};

  for (const { fieldName, newFieldValue } of updateFields) {
    const field = availableColumns[fieldName];
    if (!field) {
      throw new Error(
        `Column ${fieldName} does not exist in table ${tableName}.`,
      );
    }

    const value = newFieldValue['newFieldValue'];

    const decimalPlaces = getFieldDecimalPlaces(field);

    if (decimalPlaces === undefined) {
      fieldsToUpdate[fieldName] = value;
      continue;
    }

    if (value == null || (typeof value === 'string' && value.trim() === '')) {
      fieldsToUpdate[fieldName] = value;
      continue;
    }

    if (options.roundToFieldPrecision) {
      fieldsToUpdate[fieldName] = formatDecimalPlaces(value, decimalPlaces);
    } else {
      if (hasMoreDecimalsThan(value, decimalPlaces)) {
        throw new Error(
          `Field "${fieldName}" allows ${decimalPlaces} decimal place(s); received ${value}. ` +
            `Enable "Round Numeric Values" or provide a value with at most ${decimalPlaces} decimals.`,
        );
      }
      fieldsToUpdate[fieldName] = value;
    }
  }

  return fieldsToUpdate;
}
