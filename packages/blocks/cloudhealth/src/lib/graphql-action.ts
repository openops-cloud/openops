import { createAction, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { cloudhealthAuth } from './auth';

const documentation = `
  ### GraphQL Query Documentation

  This action allows you to execute GraphQL queries against the CloudHealth API.

  **Usage**
  1. Write your GraphQL query in the Query field
  2. Optionally provide variables in JSON format

  **Example Query:**
  \`\`\`graphql
  query GetAccountsByStatus($status: String!) {
    accounts(status: $status) {
      id
      name
      status
      created_at
    }
  }
  \`\`\`

  **Variables:**
  \`\`\`json
  { "status": "active" }
  \`\`\`

  For more information, visit the [CloudHealth GraphQL API documentation](https://help.cloudhealthtech.com/graphql-api/).
`;

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
    documentation: Property.MarkDown({
      value: documentation,
    }),
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

    const result = await response.json();
    const errorMessages = [];

    if (result.errors) {
      errorMessages.push(
        `GraphQL Error: ${result.errors
          .map((error: any) => error.message)
          .join(' | ')}`,
      );
    }

    if (!response.ok) {
      errorMessages.push(`GraphQL request failed: ${response.statusText}`);
    }

    if (errorMessages.length > 0) {
      const combinedError = errorMessages.join(' | ');
      logger.error(combinedError);
      throw new Error(combinedError);
    }

    return result.data;
  },
});
