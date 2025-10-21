import { httpClient, HttpMethod } from '@openops/blocks-common';
import {
  createAction,
  DynamicPropsValue,
  Property,
} from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { servicenowAuth, ServiceNowAuth } from '../lib/auth';
import { buildServiceNowApiUrl } from '../lib/build-api-url';
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
    fields: Property.DynamicProperties({
      displayName: 'Model',
      required: false,
      refreshers: ['auth', 'tableName'],
      props: async ({ auth, tableName }) => {
        const props: DynamicPropsValue = {};

        if (!auth || !tableName) {
          return props;
        }

        try {
          const fields = await getServiceNowTableFields(
            auth as ServiceNowAuth,
            tableName as unknown as string,
          );

          if (fields.length === 0) {
            return props;
          }

          const fieldOptions = fields.map((field) => ({
            label: field.column_label
              ? `${field.column_label} (${field.element})`
              : field.element,
            value: field.element,
          }));

          const defaultValues = fields.map((field) => field.element);

          props['fields'] = Property.StaticMultiSelectDropdown<string>({
            displayName: 'Fields',
            description: 'Select the fields to return.',
            required: true,
            options: {
              disabled: false,
              options: fieldOptions,
            },
            defaultValue: defaultValues,
          });
        } catch (error) {
          logger.error(
            'Fetching ServiceNow table fields is not possible, omit field selector. Error:',
            { error },
          );
        }

        return props;
      },
    }),
  },
  async run(context) {
    const auth = context.auth as ServiceNowAuth;
    const { tableName, sysId, fields } = context.propsValue;

    const queryParams: Record<string, string> = {};

    const selectedFields = (fields as { fields?: string[] })?.fields;
    if (Array.isArray(selectedFields) && selectedFields.length) {
      queryParams['sysparm_fields'] = selectedFields.join(',');
    }

    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: buildServiceNowApiUrl(auth, `${tableName}/${sysId}`),
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
