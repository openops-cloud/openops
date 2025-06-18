import { createAction, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { cloudhealthAuth } from './auth';

async function getAccessToken(apiKey: string) {
  const response = await fetch('https://chapi.cloudhealthtech.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation Login($apiKey: String!) { loginAPI(apiKey: $apiKey) { accessToken } }`,
      variables: { apiKey },
    }),
  });
  const result = await response.json();
  if (!response.ok || result.errors)
    throw new Error('Invalid API key or login failed');
  return result.data.loginAPI.accessToken;
}

export const graphqlAction = createAction({
  name: 'graphql_query',
  displayName: 'Execute GraphQL Query',
  description: 'Execute a GraphQL query against the CloudHealth API',
  auth: cloudhealthAuth,
  props: {
    query: Property.LongText({
      displayName: 'GraphQL Query',
      description: 'The GraphQL query to execute',
      required: true,
    }),
    variables: Property.Json({
      displayName: 'Variables',
      description: 'Optional variables for the GraphQL query',
      required: false,
    }),
  },
  async run(context) {
    const { query, variables } = context.propsValue;
    const apiKey = context.auth;
    const accessToken = await getAccessToken(apiKey);

    const response = await fetch('https://chapi.cloudhealthtech.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: variables ?? {} }),
    });

    if (!response.ok) {
      const errorMessages = `GraphQL request failed: ${response.statusText}`;
      logger.error(errorMessages);
      throw new Error(errorMessages);
    }

    const result = await response.json();

    if (result.errors) {
      const errorMessages = `GraphQL Error: ${result.errors[0].message}`;
      logger.error(errorMessages);
      throw new Error(errorMessages);
    }

    return result.data;
  },
});
