import { executeGraphQLQuery } from './execute-graphql-query';

export async function getAzureSubscriptions(
  apiKey: string,
): Promise<unknown[]> {
  const query = `query {
    azureSubscriptions (
        filterRules: []
    ) {
        totalCount
        edges {
            node {
                id
                azureId
                name
                accountId
            }
        }
        pageInfo{
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
        }
    }
}`;

  return await executeGraphQLQuery({ apiKey, query });
}
