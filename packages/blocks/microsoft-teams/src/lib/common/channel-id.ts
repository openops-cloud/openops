import { PageCollection } from '@microsoft/microsoft-graph-client';
import { Channel } from '@microsoft/microsoft-graph-types';
import {
  BlockPropValueSchema,
  DropdownOption,
  Property,
} from '@openops/blocks-framework';
import { getMicrosoftGraphClient } from '@openops/common';
import { microsoftTeamsAuth } from './microsoft-teams-auth';
import { parseMsPaginatedData } from './parse-ms-paginated-data';

export const channelId = Property.Dropdown({
  displayName: 'Channel ID',
  refreshers: ['auth', 'teamId'],
  required: true,
  options: async ({ auth, teamId }) => {
    if (!auth || !teamId) {
      return {
        disabled: true,
        placeholder: 'Please connect your account first and select team.',
        options: [],
      };
    }
    const authValue = auth as BlockPropValueSchema<typeof microsoftTeamsAuth>;
    const client = getMicrosoftGraphClient(authValue.access_token);

    const options: DropdownOption<string>[] = [];

    // Pagination : https://learn.microsoft.com/en-us/graph/sdks/paging?view=graph-rest-1.0&tabs=typescript#manually-requesting-subsequent-pages
    // List Channels : https://learn.microsoft.com/en-us/graph/api/channel-list?view=graph-rest-1.0&tabs=http
    const response: PageCollection = await client
      .api(`/teams/${teamId}/channels`)
      .get();

    await parseMsPaginatedData(
      client,
      response,
      options,
      (options, channel: Channel) => {
        options.push({ label: channel.displayName!, value: channel.id! });
      },
    );

    return {
      disabled: false,
      options: options,
    };
  },
});
