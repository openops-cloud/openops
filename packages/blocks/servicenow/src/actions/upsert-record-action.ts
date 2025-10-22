import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { servicenowAuth, ServiceNowAuth } from '../lib/auth';
import { buildServiceNowApiUrl } from '../lib/build-api-url';
import { generateAuthHeader } from '../lib/generate-auth-header';
import { servicenowTableDropdownProperty } from '../lib/table-dropdown-property';
import { createFieldsPropertiesForCreate } from './create-fields-properties';

export const upsertRecordAction = createAction({
  auth: servicenowAuth,
  name: 'upsert_record',
  description:
    'Create a new record or update an existing record in a ServiceNow table.',
  displayName: 'Add or Update Record',
  isWriteAction: true,
  props: {
    tableName: servicenowTableDropdownProperty(),
    sysId: Property.ShortText({
      displayName: 'System ID',
      description:
        'The sys_id of the record to update. If left empty or if the record does not exist, a new record will be created.',
      required: false,
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
        return createFieldsPropertiesForCreate(
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
        fieldValue: unknown;
      }[]) ?? [];

    const body: Record<string, unknown> = {};
    for (const { fieldName, fieldValue } of fields) {
      body[fieldName] = (fieldValue as Record<string, unknown>)['fieldValue'];
    }

    let recordToUpdate: unknown = undefined;

    if (sysId && typeof sysId === 'string' && sysId.trim() !== '') {
      try {
        const getResponse = await httpClient.sendRequest({
          method: HttpMethod.GET,
          url: buildServiceNowApiUrl(auth, `${tableName}/${sysId}`),
          headers: {
            ...generateAuthHeader({
              username: auth.username,
              password: auth.password,
            }),
            Accept: 'application/json',
          },
        });

        if (getResponse.body?.result) {
          recordToUpdate = getResponse.body.result;
        }
      } catch (error) {
        logger.debug(`Unable to retrieve record with sys_id = ${sysId}`, {
          error,
        });
        recordToUpdate = undefined;
      }
    }

    if (recordToUpdate) {
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
