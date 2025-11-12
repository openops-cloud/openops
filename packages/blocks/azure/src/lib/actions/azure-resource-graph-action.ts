import { createAction, Property, Validators } from '@openops/blocks-framework';
import {
  azureAuth,
  getUseHostSessionProperty,
  makeHttpRequest,
} from '@openops/common';
import { AxiosHeaders } from 'axios';
import { getAzureAccessToken } from '../auth/get-azure-access-token';
import { createSubscriptionDynamicProperty } from '../common-properties';

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
    query: Property.LongText({
      displayName: 'KQL Query',
      description: 'The Kusto Query Language (KQL) query to execute.',
      required: true,
    }),
    useHostSession: getUseHostSessionProperty('Azure', 'az login'),
    querySubscriptions: createSubscriptionDynamicProperty(
      {
        displayName: 'Query Subscriptions',
        description:
          'Select Azure subscriptions to query for Azure Resource Graph.',
        required: true,
        multiSelect: true,
        preselectAll: true,
      },
      'querySubscriptions',
    ),
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
      querySubscriptions,
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

    const subscriptionList = querySubscriptions as string[] | undefined;

    const token = await getAzureAccessToken(
      context.auth,
      !!useHostSession?.['useHostSessionCheckbox'],
    );

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
      data: allResults,
      query: kql,
      querySubscriptions: subscriptionList,
    };
  },
});
