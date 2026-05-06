import {
  HttpError,
  HttpHeaders,
  HttpMethod,
  HttpRequest,
  QueryParams,
  httpClient,
} from '@openops/blocks-common';
import { Property, createAction } from '@openops/blocks-framework';
import { azureAuth, getUseHostSessionProperty } from '@openops/common';
import { getAzureAccessToken } from '../auth/get-azure-access-token';
import { getSubscriptionsDropdownForHostSession } from '../common-properties';

const DEFAULT_BASE_URL = 'https://management.azure.com/?api-version=2025-04-01';
const DEFAULT_RETRY_DELAY_MS = 60000;
const MAX_RETRY_ATTEMPTS = 4;
const COST_MANAGEMENT_RETRY_AFTER_HEADER_PATTERN =
  /^x-ms-ratelimit-microsoft\.costmanagement.*-retry-after$/i;
const RETRY_AFTER_HEADERS = [
  'x-ms-ratelimit-microsoft.consumption-retry-after',
  'x-ms-ratelimit-retailprices-retry-after',
  'retry-after',
];

export const customAzureApiCallAction = createAction({
  auth: azureAuth,
  name: 'custom_azure_api_call',
  description: 'Make a custom REST API call to Azure.',
  displayName: 'Custom Azure API Call',
  isWriteAction: true,
  props: {
    documentation: Property.MarkDown({
      value:
        'For more information, visit the [Azure API documentation](https://learn.microsoft.com/rest/api/azure/).',
    }),
    useHostSession: getUseHostSessionProperty('Azure', 'az login'),
    subscriptions: Property.DynamicProperties({
      displayName: '',
      required: true,
      refreshers: [
        'auth',
        'useHostSession',
        'useHostSession.useHostSessionCheckbox',
      ],
      props: async ({
        auth,
        useHostSession,
      }): Promise<{ [key: string]: any }> => {
        if (useHostSession?.['useHostSessionCheckbox'] as boolean) {
          return {
            subDropdown: await getSubscriptionsDropdownForHostSession(auth),
          } as any;
        }
        return {};
      },
    }),
    url: Property.DynamicProperties({
      displayName: '',
      required: true,
      refreshers: ['auth'],
      props: async () => {
        return {
          url: Property.ShortText({
            displayName: 'URL',
            description: 'The full URL to use, including the base URL',
            required: true,
            defaultValue: DEFAULT_BASE_URL,
          }),
        };
      },
    }),
    method: Property.StaticDropdown({
      displayName: 'Method',
      required: true,
      options: {
        options: Object.values(HttpMethod).map((value) => ({
          label: value,
          value,
        })),
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
  run: async (context) => {
    const { method, url, headers, queryParams, body, failsafe, timeout } =
      context.propsValue;

    const urlValue = url?.['url'];
    if (!method || !urlValue) {
      throw new Error('Method and URL are required.');
    }

    let headersValue = (headers as HttpHeaders | undefined) ?? {};
    const authHeaders = await getAuthHeaders(context);
    headersValue = {
      ...headersValue,
      ...authHeaders,
    };

    const request: HttpRequest<Record<string, unknown>> = {
      method,
      url: urlValue,
      headers: headersValue,
      queryParams: (queryParams as QueryParams | undefined) ?? {},
      timeout: timeout ? timeout * 1000 : 0,
      ...(body ? { body } : {}),
    };

    try {
      return await sendWithRetry(request);
    } catch (error) {
      if (failsafe && error instanceof HttpError) {
        return error.errorMessage();
      }
      throw error;
    }
  },
});

async function getAuthHeaders(context: any): Promise<HttpHeaders> {
  const shouldUseHostCredentials =
    context.propsValue.useHostSession?.['useHostSessionCheckbox'];
  const selectedSubscription =
    context.propsValue?.subscriptions?.['subDropdown'];

  const token = await getAzureAccessToken(
    context.auth,
    !!shouldUseHostCredentials,
    selectedSubscription,
  );

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function sendWithRetry(
  request: HttpRequest<Record<string, unknown>>,
): Promise<unknown> {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      return await httpClient.sendRequest(request);
    } catch (error) {
      if (!(error instanceof HttpError) || error.response.status !== 429) {
        throw error;
      }

      if (attempt === MAX_RETRY_ATTEMPTS) {
        throw error;
      }

      await sleep(getRetryDelayMs(error.response.headers, attempt));
    }
  }

  throw new Error(`Failed to send Azure API request to ${request.url}`);
}

export function getRetryDelayMs(
  headers: HttpHeaders | undefined,
  attempt: number,
): number {
  const retryDelayMs = getHeaderRetryDelayMs(headers);
  if (retryDelayMs === null) {
    return Math.pow(2, attempt - 1) * DEFAULT_RETRY_DELAY_MS;
  }

  return retryDelayMs;
}

function getHeaderRetryDelayMs(
  headers: HttpHeaders | undefined,
): number | null {
  if (!headers) {
    return null;
  }

  const retryValues: string[] = [];

  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (
      RETRY_AFTER_HEADERS.includes(headerName.toLowerCase()) ||
      COST_MANAGEMENT_RETRY_AFTER_HEADER_PATTERN.test(headerName)
    ) {
      retryValues.push(...normalizeHeaderValues(headerValue));
    }
  }

  if (retryValues.length === 0) {
    return null;
  }

  const retryDelaysMs = retryValues
    .map((value) => parseRetryDelayMs(value))
    .filter((value): value is number => value !== null);

  if (retryDelaysMs.length === 0) {
    return null;
  }

  return Math.max(...retryDelaysMs);
}

function normalizeHeaderValues(
  headerValue: string | string[] | undefined,
): string[] {
  if (!headerValue) {
    return [];
  }

  return Array.isArray(headerValue) ? headerValue : [headerValue];
}

function parseRetryDelayMs(headerValue: string): number | null {
  const trimmedValue = headerValue.trim();
  if (trimmedValue.length === 0) {
    return null;
  }

  const retryAfterSeconds = Number.parseInt(trimmedValue, 10);
  if (Number.isFinite(retryAfterSeconds)) {
    return retryAfterSeconds * 1000;
  }

  const retryDate = Date.parse(trimmedValue);
  if (Number.isNaN(retryDate)) {
    return null;
  }

  return Math.max(retryDate - Date.now(), DEFAULT_RETRY_DELAY_MS);
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
