import {
  createCustomApiCallAction,
  httpClient,
  HttpError,
  HttpHeaders,
  HttpRequest,
} from '@openops/blocks-common';
import { Property } from '@openops/blocks-framework';
import { azureAuth, getUseHostSessionProperty } from '@openops/common';
import { getAzureAccessToken } from '../auth/get-azure-access-token';
import { getSubscriptionsDropdownForHostSession } from '../common-properties';

const DEFAULT_RETRY_DELAY_MS = 60000;
const MAX_RETRY_ATTEMPTS = 4;
const COST_MANAGEMENT_RETRY_AFTER_HEADER_PATTERN =
  /^x-ms-ratelimit-microsoft\.costmanagement.*-retry-after$/i;
const RETRY_AFTER_HEADERS = [
  'x-ms-ratelimit-microsoft.consumption-retry-after',
  'x-ms-ratelimit-retailprices-retry-after',
  'retry-after',
];

export const customAzureApiCallAction = createCustomApiCallAction({
  auth: azureAuth,
  baseUrl: () => 'https://management.azure.com/?api-version=2025-04-01',
  name: 'custom_azure_api_call',
  description: 'Make a custom REST API call to Azure.',
  displayName: 'Custom Azure API Call',
  additionalProps: {
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
  },
  authMapping: async (context: any) => {
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
  },
  requestHandler: sendWithRetry,
});

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
