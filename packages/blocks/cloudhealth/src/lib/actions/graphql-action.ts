import { createAction, Property } from '@openops/blocks-framework';
import { cloudhealthAuth } from '../auth';
import { executeGraphQLQuery } from '../common/execute-graphql-query';

const documentation = `
  ### GraphQL Query Documentation

  This action allows you to execute GraphQL queries against the CloudHealth API.

  **Usage**
  1. Write your GraphQL query in the Query field
  2. Optionally provide variables in JSON format

  **Example Query:**
  \`\`\`graphql
  query Budget($cloud: CloudType) {
    budgets(cloud: $cloud) {
      id
      name
      cloud
    }
  }
  \`\`\`

  **Variables:**
  \`\`\`json
  { "cloud": "AWS" }
  \`\`\`

  **Note:** Make sure your query parameters match the variables you provide. The query above filters budgets by cloud provider.

  For more information, visit the [CloudHealth GraphQL API documentation](https://help.cloudhealthtech.com/graphql-api/).
`;

export const graphqlAction = createAction({
  name: 'graphql_query',
  displayName: 'Execute GraphQL Query',
  description: 'Execute a GraphQL query',
  auth: cloudhealthAuth,
  IsWriteAction: true,
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

    return await executeGraphQLQuery({
      query,
      variables,
      apiKey,
    });
  },
});
