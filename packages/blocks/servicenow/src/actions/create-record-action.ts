import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { servicenowAuth, ServiceNowAuth } from '../lib/auth';
import { buildServiceNowApiUrl } from '../lib/build-api-url';
import { generateAuthHeader } from '../lib/generate-auth-header';
import { servicenowTableDropdownProperty } from '../lib/table-dropdown-property';
import { createFieldsPropertiesForCreate } from './create-fields-properties';

export const createRecordAction = createAction({
  auth: servicenowAuth,
  name: 'create_record',
  description: 'Create a new record in a ServiceNow table.',
  displayName: 'Create Record',
  isWriteAction: true,
  props: {
    tableName: servicenowTableDropdownProperty(),
    fieldsProperties: Property.DynamicProperties({
      displayName: '',
      description: '',
      required: true,
      refreshers: ['auth', 'tableName'],
      props: async ({ auth, tableName }) => {
        if (!auth || !tableName) {
          return {};
        }
        return createFieldsPropertiesForCreate(
          auth as ServiceNowAuth,
          tableName as unknown as string,
        );
      },
    }),
  },
  async run(context) {
    const auth = context.auth as ServiceNowAuth;
    const { tableName, fieldsProperties } = context.propsValue;

    const fields =
      (fieldsProperties['fieldsProperties'] as unknown as {
        fieldName: string;
        fieldValue: any;
      }[]) ?? [];

    const body: Record<string, any> = {};
    for (const { fieldName, fieldValue } of fields) {
      body[fieldName] = fieldValue['fieldValue'];
    }

    const response = await httpClient.sendRequest({
      method: HttpMethod.POST,
      url: buildServiceNowApiUrl(auth, tableName as string),
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
