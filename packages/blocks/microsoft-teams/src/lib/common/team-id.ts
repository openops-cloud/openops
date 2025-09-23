import { Client, PageCollection } from '@microsoft/microsoft-graph-client';
import { Channel, Team } from '@microsoft/microsoft-graph-types';
import {
  BlockPropValueSchema,
  DropdownOption,
  Property,
} from '@openops/blocks-framework';
import { getMicrosoftGraphClient } from '@openops/common';
import { microsoftTeamsAuth } from './microsoft-teams-auth';
import { parseMsPaginatedData } from './parse-ms-paginated-data';

export const teamId = Property.Dropdown({
  displayName: 'Team ID',
  refreshers: ['auth'],
  required: true,
  options: async ({ auth }) => {
    if (!auth) {
      return {
        disabled: true,
        placeholder: 'Please connect your account first.',
        options: [],
      };
    }
    const authValue = auth as BlockPropValueSchema<typeof microsoftTeamsAuth>;
    const client = getMicrosoftGraphClient(authValue.access_token);

    const options: DropdownOption<string>[] = [];

    // Pagination : https://learn.microsoft.com/en-us/graph/sdks/paging?view=graph-rest-1.0&tabs=typescript#manually-requesting-subsequent-pages
    // List Joined Channels : https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams?view=graph-rest-1.0&tabs=http
    const response: PageCollection = await client.api('/me/joinedTeams').get();
    await parseMsPaginatedData(
      client,
      response,
      options,
      (options, team: Team) => {
        options.push({ label: team.displayName!, value: team.id! });
      },
    );
    return {
      disabled: false,
      options: options,
    };
  },
});
