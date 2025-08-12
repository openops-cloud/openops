import { executeGraphQLQuery } from './execute-graphql-query';

export async function getGcpProjects(apiKey: string): Promise<unknown[]> {
  const query = `query {
    gcpProjects (input: {
      filterRules: [],
      sortRules: [
        {
          field: "googleProjectName"
        }
      ],
    }) {
        edges {
            node {
                id
                accountId
                gcpBillingAccountId
                name
                friendlyName
                googleProjectName
                projectNumber
                healthStatus
                healthStatusDescription
                serviceAccountEmail
                isActive
            }
            cursor
        }
        pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
        }
    }
}`;

  return await executeGraphQLQuery({ apiKey, query });
}
