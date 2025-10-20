import { Property } from '@openops/blocks-framework';
import { ServiceNowAuth } from '../lib/auth';
import { createFieldValueProperty } from '../lib/create-field-value-property';
import { getServiceNowTableFields } from '../lib/get-table-fields';

export async function createFieldsPropertiesForCreate(
  auth: ServiceNowAuth,
  tableName: string,
  displayName = 'Fields to create',
) {
  const tableFields = await getServiceNowTableFields(auth, tableName);

  const properties: { [key: string]: any } = {};
  properties['fieldsProperties'] = Property.Array({
    displayName,
    required: true,
    properties: {
      fieldName: Property.StaticDropdown<string>({
        displayName: 'Field name',
        required: true,
        options: {
          options: tableFields
            .filter(
              (f) =>
                f.read_only !== 'true' &&
                f.primary !== 'true' &&
                f.internal_type?.value !== 'collection',
            )
            .map((f) => ({
              label: f.column_label
                ? `${f.column_label} (${f.element})`
                : f.element,
              value: f.element,
            })),
        },
      }),
      fieldValue: Property.DynamicProperties({
        displayName: 'Field value',
        required: true,
        refreshers: ['fieldName'],
        props: async ({ fieldName }) => {
          const innerProps: { [key: string]: any } = {};
          const currentField = fieldName as unknown as string;

          if (!currentField) {
            innerProps['fieldValue'] = {};
            return innerProps;
          }

          const serviceNowField = tableFields.find(
            (f) => f.element === currentField,
          );

          if (!serviceNowField) {
            innerProps['fieldValue'] = Property.ShortText({
              displayName: 'Value',
              required: false,
            });
            return innerProps;
          }

          innerProps['fieldValue'] = await createFieldValueProperty(
            serviceNowField,
            auth,
            tableName,
            false,
          );

          return innerProps;
        },
      }),
    },
  });
  return properties;
}

export async function createFieldsPropertiesForUpdate(
  auth: ServiceNowAuth,
  tableName: string,
  displayName = 'Fields to update',
) {
  const tableFields = await getServiceNowTableFields(auth, tableName);

  const properties: { [key: string]: any } = {};
  properties['fieldsProperties'] = Property.Array({
    displayName,
    required: true,
    properties: {
      fieldName: Property.StaticDropdown<string>({
        displayName: 'Field name',
        required: true,
        options: {
          options: tableFields
            .filter(
              (f) =>
                f.read_only !== 'true' &&
                f.primary !== 'true' &&
                f.internal_type?.value !== 'collection',
            )
            .map((f) => ({
              label: f.column_label
                ? `${f.column_label} (${f.element})`
                : f.element,
              value: f.element,
            })),
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
            return innerProps;
          }

          const serviceNowField = tableFields.find(
            (f) => f.element === currentField,
          );

          if (!serviceNowField) {
            innerProps['newFieldValue'] = Property.ShortText({
              displayName: 'Value',
              required: false,
            });
            return innerProps;
          }

          innerProps['newFieldValue'] = await createFieldValueProperty(
            serviceNowField,
            auth,
            tableName,
            false,
          );

          return innerProps;
        },
      }),
    },
  });
  return properties;
}
