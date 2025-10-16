import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { servicenowAuth, ServiceNowAuth } from '../lib/auth';
import { generateAuthHeader } from '../lib/generate-auth-header';
import { getServiceNowTableFields } from '../lib/get-table-fields';
import { servicenowTableDropdownProperty } from '../lib/table-dropdown-property';

export const getRecordAction = createAction({
  auth: servicenowAuth,
  name: 'get_record',
  description: 'Get a single record from a ServiceNow table by its sys_id.',
  displayName: 'Get Record',
  isWriteAction: false,
  props: {
    tableName: servicenowTableDropdownProperty(),
    sysId: Property.ShortText({
      displayName: 'System ID',
      description: 'The sys_id of the record to retrieve.',
      required: true,
    }),
    fields: Property.MultiSelectDropdown({
      displayName: 'Fields',
      description:
        'Select the fields to return. Leave empty to return all fields.',
      required: false,
      refreshers: ['auth', 'tableName'],
      options: async ({ auth, tableName }) => {
        if (!auth || !tableName) {
          return {
            disabled: true,
            options: [],
            placeholder: tableName
              ? 'Please authenticate first'
              : 'Please select a table first',
          };
        }

        try {
          const fields = await getServiceNowTableFields(
            auth as ServiceNowAuth,
            tableName as string,
          );

          if (fields.length === 0) {
            return {
              disabled: true,
              options: [],
              placeholder: 'No fields found for this table',
            };
          }

          return {
            disabled: false,
            options: fields.map((field) => ({
              label: field.column_label
                ? `${field.column_label} (${field.element})`
                : field.element,
              value: field.element,
            })),
          };
        } catch (error) {
          return {
            disabled: true,
            options: [],
            placeholder: 'Failed to fetch fields',
            error: (error as Error).message,
          };
        }
      },
    }),
  },
  async run(context) {
    const auth = context.auth as ServiceNowAuth;
    const { tableName, sysId, fields } = context.propsValue;

    const queryParams: Record<string, string> = {};

    if (fields && Array.isArray(fields) && fields.length > 0) {
      queryParams['sysparm_fields'] = fields.join(',');
    }

    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: `https://${auth.instanceName}.service-now.com/api/now/table/${tableName}/${sysId}`,
      headers: {
        ...generateAuthHeader({
          username: auth.username,
          password: auth.password,
        }),
        Accept: 'application/json',
      },
      queryParams,
    });

    return response.body;
  },
});
