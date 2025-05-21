import { PageCollection } from '@microsoft/microsoft-graph-client';
import { Team } from '@microsoft/microsoft-graph-types';
import { OAuth2PropertyValue, OAuth2Props } from '@openops/blocks-framework';
import { getMicrosoftGraphClient } from './get-microsoft-graph-client';
import { parseMsPaginatedData } from './parse-ms-paginated-data';

export async function getAllTeams(
  auth: OAuth2PropertyValue<OAuth2Props>,
): Promise<string[]> {
  const client = getMicrosoftGraphClient(auth.access_token);

  const options: string[] = [];

  // Pagination : https://learn.microsoft.com/en-us/graph/sdks/paging?view=graph-rest-1.0&tabs=typescript#manually-requesting-subsequent-pages
  // List Joined Channels : https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams?view=graph-rest-1.0&tabs=http
  const response: PageCollection = await client.api('/me/joinedTeams').get();
  await parseMsPaginatedData(
    client,
    response,
    options,
    (options, team: Team) => {
      options.push(team.id!);
    },
  );

  return options;
}
