import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { servicenowAuth, ServiceNowAuth } from '../lib/auth';
import { buildServiceNowApiUrl } from '../lib/build-api-url';
import { generateAuthHeader } from '../lib/generate-auth-header';
import { servicenowTableDropdownProperty } from '../lib/table-dropdown-property';
import { createFieldsPropertiesForUpdate } from './create-fields-properties';

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
        return createFieldsPropertiesForUpdate(
          auth as ServiceNowAuth,
          tableName as unknown as string,
        );
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
      url: buildServiceNowApiUrl(auth, `${tableName}/${sysId}`),
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
