import {
  httpClient,
  HttpError,
  HttpHeaders,
  HttpMethod,
  HttpRequest,
  QueryParams,
} from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { accountSingleSelectProperty } from './account-property';
import { anadotAuth } from './anodot-auth-property';
import {
  buildUserAccountApiKey,
  createAnodotAuthHeaders,
} from './common/anodot-requests-helpers';
import { authenticateUserWithAnodot } from './common/auth';

export const customAnodotApiAction = createAction({
  auth: anadotAuth,
  name: 'custom_anodot_api_action',
  description: 'Call Umbrella API',
  displayName: 'Custom Umbrella API Action',
  props: {
    selectedAccount: accountSingleSelectProperty(),
    url: Property.DynamicProperties({
      displayName: '',
      required: true,
      refreshers: ['auth'],
      props: async ({ auth }: any) => {
        return {
          url: Property.ShortText({
            displayName: 'URL',
            description: 'The full URL to use, including the base URL',
            required: true,
            defaultValue: auth.apiUrl,
          }),
        };
      },
    }),
    method: Property.StaticDropdown({
      displayName: 'Method',
      required: true,
      options: {
        options: Object.values(HttpMethod).map((v) => {
          return {
            label: v,
            value: v,
          };
        }),
      },
    }),
    headers: Property.Object({
      displayName: 'Headers',
      description:
        'Authorization headers are injected automatically from your connection.',
      required: false,
    }),
    queryParams: Property.Object({
      displayName: 'Query Parameters',
      required: false,
    }),
    body: Property.Json({
      displayName: 'Body',
      required: false,
    }),
    failsafe: Property.Checkbox({
      displayName: 'No Error on Failure',
      required: false,
    }),
    timeout: Property.Number({
      displayName: 'Timeout (in seconds)',
      required: false,
    }),
  },
  async run(context) {
    const { authUrl, username, password } = context.auth;
    const {
      selectedAccount,
      method,
      url,
      headers,
      queryParams,
      body,
      failsafe,
      timeout,
    } = context.propsValue;

    const anodotTokens = await authenticateUserWithAnodot(
      authUrl,
      username,
      password,
    );

    const accountApiKey = buildUserAccountApiKey(
      anodotTokens.apikey,
      (selectedAccount as any).accountKey,
      (selectedAccount as any).divisionId,
    );

    let anodotHeaders: HttpHeaders = createAnodotAuthHeaders(
      anodotTokens.Authorization,
      accountApiKey,
    );

    if (headers) {
      anodotHeaders = {
        ...anodotHeaders,
        ...(headers as HttpHeaders),
      };
    }

    const request: HttpRequest<Record<string, unknown>> = {
      method,
      url: url['url'],
      headers: anodotHeaders,
      queryParams: queryParams as QueryParams,
      timeout: timeout ? timeout * 1000 : 0,
    };

    if (body) {
      request.body = body;
    }

    try {
      return await httpClient.sendRequest(request);
    } catch (error) {
      if (failsafe) {
        return (error as HttpError).errorMessage();
      }
      throw error;
    }
  },
});
