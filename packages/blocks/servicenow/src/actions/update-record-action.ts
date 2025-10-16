import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { servicenowAuth, ServiceNowAuth } from '../lib/auth';
import { createFieldValueProperty } from '../lib/create-field-value-property';
import { generateAuthHeader } from '../lib/generate-auth-header';
import { getServiceNowTableFields } from '../lib/get-table-fields';
import { servicenowTableDropdownProperty } from '../lib/table-dropdown-property';

export const updateRecordAction = createAction({
  auth: servicenowAuth,
  name: 'update_record',
  description: 'Update an existing record in a ServiceNow table.',
  displayName: 'Update Record',
  isWriteAction: true,
  props: {
    tableName: servicenowTableDropdownProperty(),
    sysId: Property.ShortText({
      displayName: 'System ID',
      description: 'The sys_id of the record to update.',
      required: true,
    }),
    fieldsProperties: Property.DynamicProperties({
      displayName: '',
      description: '',
      required: true,
      refreshers: ['auth', 'tableName'],
      props: async ({ auth, tableName }) => {
        if (!auth || !tableName) {
          return {};
        }

        const tableFields = await getServiceNowTableFields(
          auth as ServiceNowAuth,
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
                  auth as ServiceNowAuth,
                  tableName as unknown as string,
                  false,
                );

                return innerProps;
              },
            }),
          },
        });
        return properties;
      },
    }),
  },
  async run(context) {
    const auth = context.auth as ServiceNowAuth;
    const { tableName, sysId, fieldsProperties } = context.propsValue;

    const fields =
      (fieldsProperties['fieldsProperties'] as unknown as {
        fieldName: string;
        newFieldValue: any;
      }[]) ?? [];

    const body: Record<string, any> = {};
    for (const { fieldName, newFieldValue } of fields) {
      body[fieldName] = newFieldValue['newFieldValue'];
    }

    const response = await httpClient.sendRequest({
      method: HttpMethod.PATCH,
      url: `https://${auth.instanceName}.service-now.com/api/now/table/${tableName}/${sysId}`,
      headers: {
        ...generateAuthHeader({
          username: auth.username,
          password: auth.password,
        }),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body,
    });

    return response.body;
  },
});
