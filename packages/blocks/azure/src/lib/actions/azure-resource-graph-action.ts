import { createAction, Property, Validators } from '@openops/blocks-framework';
import {
  authenticateUserWithAzure,
  azureAuth,
  getUseHostSessionProperty,
  makeHttpRequest,
} from '@openops/common';
import { AxiosHeaders } from 'axios';
import { runCommand } from '../azure-cli';
import { subDropdown } from '../common-properties';

const RESOURCE_GRAPH_API_VERSION = '2024-04-01';
const BATCH_SIZE = 1000;

interface ResourceGraphResponse {
  data: Record<string, unknown>[];
  $skipToken?: string;
}

interface ResourceGraphRequestBody {
  query: string;
  options: {
    $top: number;
    $skipToken?: string;
  };
  subscriptions?: string[];
}

const buildResourceGraphUrl = (apiVersion: string): string =>
  `https://management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=${apiVersion}`;

const parseAzAccessToken = (raw?: string | null): string => {
  const parsed = JSON.parse(raw ?? '{}');
  const token = parsed?.accessToken;
  if (!token) {
    throw new Error('Failed to obtain Azure access token');
  }
  return token;
};

const getHostAccessToken = async (
  auth: unknown,
  subscription?: string,
): Promise<string> => {
  const output = await runCommand(
    'account get-access-token --resource https://management.azure.com --output json',
    auth,
    true,
    subscription,
  );
  return parseAzAccessToken(output);
};

const buildRequestBody = (
  query: string,
  batch?: string[],
  skipToken?: string,
): ResourceGraphRequestBody => ({
  query,
  options: {
    $top: BATCH_SIZE,
    ...(skipToken && { $skipToken: skipToken }),
  },
  ...(batch?.length && { subscriptions: batch }),
});

const queryBatch = async (
  url: string,
  headers: AxiosHeaders,
  query: string,
  batch?: string[],
  hardLimit?: number,
): Promise<Record<string, unknown>[]> => {
  const results: Record<string, unknown>[] = [];
  let skipToken: string | undefined;

  do {
    const requestBody = buildRequestBody(query, batch, skipToken);
    const response = await makeHttpRequest<ResourceGraphResponse>(
      'POST',
      url,
      headers,
      requestBody,
    );

    if (response.data?.length) {
      if (hardLimit) {
        const remaining = hardLimit - results.length;
        results.push(...response.data.slice(0, remaining));
        if (results.length >= hardLimit) {
          break;
        }
      } else {
        results.push(...response.data);
      }
    }

    skipToken = response.$skipToken;
  } while (skipToken);

  return results;
};

export const azureResourceGraphAction = createAction({
  auth: azureAuth,
  name: 'resource_graph_query',
  description:
    'Query Azure Resource Graph using KQL to retrieve resources across multiple subscriptions',
  displayName: 'Azure Resource Graph Query',
  isWriteAction: false,
  props: {
    useHostSession: getUseHostSessionProperty('Azure', 'az login'),
    subscriptions: subDropdown,
    query: Property.LongText({
      displayName: 'KQL Query',
      description: 'The Kusto Query Language (KQL) query to execute.',
      required: true,
    }),
    querySubscriptions: Property.Array({
      displayName: 'Query Subscription IDs',
      description:
        'Array of Azure subscription IDs to query. Leave empty to query all accessible subscriptions.',
      required: false,
    }),
    limitSubscriptions: Property.Checkbox({
      displayName: 'Limit Subscriptions',
      description:
        'Enable to limit the number of subscriptions queried. Azure Resource Graph has a limit of 1000 subscriptions per query.',
      required: false,
      defaultValue: true,
    }),
    subscriptionLimit: Property.DynamicProperties({
      displayName: '',
      required: true,
      refreshers: ['limitSubscriptions'],
      props: async ({ limitSubscriptions }) => {
        if (limitSubscriptions) {
          return {
            limit: Property.Number({
              displayName: 'Subscription Limit',
              description:
                'Maximum number of subscriptions to include in the query. Default is 1000 (Azure API limit).',
              required: false,
              defaultValue: 1000,
              validators: [Validators.minValue(1), Validators.integer],
            }),
          } as any;
        }
        return {};
      },
    }),
    maxResults: Property.Number({
      displayName: 'Maximum Results',
      description:
        'Maximum number of results to return. Leave empty for no limit.',
      required: false,
      validators: [Validators.minValue(1), Validators.integer],
    }),
    apiVersion: Property.ShortText({
      displayName: 'API Version',
      description:
        'Azure Resource Graph API version. Leave empty to use the latest stable version (2022-10-01).',
      required: false,
      defaultValue: RESOURCE_GRAPH_API_VERSION,
    }),
  },
  async run(context) {
    const {
      useHostSession,
      subscriptions,
      querySubscriptions,
      limitSubscriptions,
      subscriptionLimit,
      query,
      maxResults,
      apiVersion,
    } = context.propsValue;

    const kql = query?.trim();
    if (!kql) {
      throw new Error('KQL query is required.');
    }

    const normalizedMax =
      typeof maxResults === 'number' ? maxResults : undefined;

    let subscriptionList = querySubscriptions as string[] | undefined;

    if (limitSubscriptions && subscriptionList) {
      subscriptionList = subscriptionList.slice(
        0,
        subscriptionLimit?.['limit'],
      );
    }

    const token = useHostSession?.['useHostSessionCheckbox']
      ? await getHostAccessToken(context.auth, subscriptions?.['subDropdown'])
      : (await authenticateUserWithAzure(context.auth)).access_token;

    const headers = new AxiosHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    const url = buildResourceGraphUrl(apiVersion || RESOURCE_GRAPH_API_VERSION);

    const batches: (string[] | undefined)[] = [];
    if (subscriptionList?.length) {
      for (let i = 0; i < subscriptionList.length; i += BATCH_SIZE) {
        batches.push(subscriptionList.slice(i, i + BATCH_SIZE));
      }
    } else {
      batches.push(undefined);
    }

    const allResults: Record<string, unknown>[] = [];
    let remaining = normalizedMax ?? Number.POSITIVE_INFINITY;

    for (const batch of batches) {
      if (remaining <= 0) {
        break;
      }

      const batchResults = await queryBatch(
        url,
        headers,
        kql,
        batch,
        Number.isFinite(remaining) ? remaining : undefined,
      );

      allResults.push(...batchResults);
      remaining = Math.max(0, remaining - batchResults.length);
    }

    return {
      totalRecords: allResults.length,
      data: normalizedMax ? allResults.slice(0, normalizedMax) : allResults,
      query: kql,
      querySubscriptions: subscriptionList,
    };
  },
});
