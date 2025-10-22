import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { servicenowAuth, ServiceNowAuth } from '../lib/auth';
import { buildServiceNowApiUrl } from '../lib/build-api-url';
import { servicenowFieldsDropdownProperty } from '../lib/fields-dropdown-property';
import { generateAuthHeader } from '../lib/generate-auth-header';
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
    fields: servicenowFieldsDropdownProperty(),
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
