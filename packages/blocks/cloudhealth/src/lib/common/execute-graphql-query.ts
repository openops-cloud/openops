import { BASE_CH_URL } from './base-url';

const CLOUDHEALTH_GRAPHQL_API_URL = `${BASE_CH_URL}/graphql`;

export async function executeGraphQLQuery<T>({
  apiKey,
  query,
  variables,
}: {
  apiKey: string;
  query: string;
  variables?: Record<string, any>;
}): Promise<T> {
  const accessToken = await getAccessToken(apiKey);

  const response = await fetch(CLOUDHEALTH_GRAPHQL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: variables ?? {} }),
  });

  const result = await response.json();
  const errorMessages = [];

  if (result.errors) {
    errorMessages.push(
      `GraphQL Error: ${result.errors
        .map(
          (error: any) =>
            error.message +
            '\n' +
            (error.extensions?.errorMessages?.join(', ') || ''),
        )
        .join(' | ')}`,
    );
  }

  if (!response.ok) {
    errorMessages.push(`GraphQL request failed: ${response.statusText}`);
  }

  if (errorMessages.length > 0) {
    const combinedError = errorMessages.join(' | ');
    throw new Error(combinedError);
  }

  return result.data;
}

async function getAccessToken(apiKey: string) {
  const response = await fetch(CLOUDHEALTH_GRAPHQL_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation Login($apiKey: String!) { loginAPI(apiKey: $apiKey) { accessToken } }`,
      variables: { apiKey },
    }),
  });
  const result = await response.json();

  if (!response.ok || result.errors) {
    throw new Error('Invalid API key or login failed');
  }

  return result.data.loginAPI.accessToken;
}
