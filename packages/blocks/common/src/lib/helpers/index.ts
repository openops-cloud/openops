import {
  BlockAuthProperty,
  OAuth2PropertyValue,
  Property,
  createAction,
} from '@openops/blocks-framework';
import { assertNotNullOrUndefined } from '@openops/shared';
import {
  HttpError,
  HttpHeaders,
  HttpMethod,
  HttpRequest,
  QueryParams,
  httpClient,
} from '../http';

export const getAccessTokenOrThrow = (
  auth: OAuth2PropertyValue | undefined,
): string => {
  const accessToken = auth?.access_token;

  if (accessToken === undefined) {
    throw new Error('Invalid bearer token');
  }

  return accessToken;
};

export function createCustomApiCallAction({
  auth,
  baseUrl,
  authMapping,
  description,
  displayName,
  name,
  additionalProps,
}: {
  auth?: BlockAuthProperty;
  baseUrl: (auth?: unknown) => string;
  authMapping?: (context: {
    auth: unknown;
    propsValue: unknown;
  }) => Promise<HttpHeaders>;
  description?: string | null;
  displayName?: string | null;
  name?: string | null;
  additionalProps?: Record<string, any>;
}) {
  return createAction({
    name: name ? name : 'custom_api_call',
    displayName: displayName ? displayName : 'Custom API Call',
    description: description
      ? description
      : 'Make a custom API call to a specific endpoint',
    auth: auth ? auth : undefined,
    requireAuth: auth ? true : false,
    isWriteAction: true,
    props: {
      ...(additionalProps || {}),
      url: Property.DynamicProperties({
        displayName: '',
        required: true,
        refreshers: ['auth'],
        props: async ({ auth }) => {
          return {
            url: Property.ShortText({
              displayName: 'URL',
              description: 'The full URL to use, including the base URL',
              required: true,
              defaultValue: baseUrl(auth),
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
          'Authorization headers are injected automatically from your connection',
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
        displayName: 'Timeout (in Seconds)',
        required: false,
      }),
    },

    run: async (context) => {
      const { method, url, headers, queryParams, body, failsafe, timeout } =
        context.propsValue;

      assertNotNullOrUndefined(method, 'Method');
      assertNotNullOrUndefined(url, 'URL');

      let headersValue = headers as HttpHeaders;
      if (authMapping) {
        const headers = await authMapping(context);
        if (headers) {
          headersValue = {
            ...headersValue,
            ...headers,
          };
        }
      }

      const request: HttpRequest<Record<string, unknown>> = {
        method,
        url: url['url'],
        headers: headersValue,
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
}
