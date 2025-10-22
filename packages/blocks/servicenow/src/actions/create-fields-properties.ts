import { Property } from '@openops/blocks-framework';
import { ServiceNowAuth } from '../lib/auth';
import { createFieldValueProperty } from '../lib/create-field-value-property';
import {
  getServiceNowTableFields,
  ServiceNowTableField,
} from '../lib/get-table-fields';

function filterWritableFields(tableFields: ServiceNowTableField[]) {
  return tableFields.filter(
    (f) =>
      f.read_only !== 'true' &&
      f.primary !== 'true' &&
      f.internal_type?.value !== 'collection',
  );
}

function mapFieldsToOptions(tableFields: ServiceNowTableField[]) {
  return tableFields.map((f) => ({
    label: f.column_label ? `${f.column_label} (${f.element})` : f.element,
    value: f.element,
  }));
}

async function createFieldsProperties(
  auth: ServiceNowAuth,
  tableName: string,
  displayName: string,
  valuePropertyName: string,
  valueDisplayName: string,
) {
  const tableFields = await getServiceNowTableFields(auth, tableName);
  const writableFields = filterWritableFields(tableFields);

  return {
    fieldsProperties: Property.Array({
      displayName,
      required: true,
      properties: {
        fieldName: Property.StaticDropdown<string>({
          displayName: 'Field name',
          required: true,
          options: {
            options: mapFieldsToOptions(writableFields),
          },
        }),
        [valuePropertyName]: Property.DynamicProperties({
          displayName: valueDisplayName,
          required: true,
          refreshers: ['fieldName'],
          props: async ({ fieldName }) => {
            const currentField = fieldName as unknown as string;

            if (!currentField) {
              return { [valuePropertyName]: {} };
            }

            const serviceNowField = tableFields.find(
              (f) => f.element === currentField,
            );

            if (!serviceNowField) {
              return {
                [valuePropertyName]: Property.ShortText({
                  displayName: 'Value',
                  required: false,
                }),
              };
            }

            return {
              [valuePropertyName]: await createFieldValueProperty(
                serviceNowField,
                auth,
                tableName,
                false,
              ),
            };
          },
        }),
      },
    }),
  };
}

export async function createFieldsPropertiesForCreate(
  auth: ServiceNowAuth,
  tableName: string,
  displayName = 'Fields to create',
) {
  return createFieldsProperties(
    auth,
    tableName,
    displayName,
    'fieldValue',
    'Field value',
  );
}

export async function createFieldsPropertiesForUpdate(
  auth: ServiceNowAuth,
  tableName: string,
  displayName = 'Fields to update',
) {
  return createFieldsProperties(
    auth,
    tableName,
    displayName,
    'newFieldValue',
    'New field value',
  );
}
