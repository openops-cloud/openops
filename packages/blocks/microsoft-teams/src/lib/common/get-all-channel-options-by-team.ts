import { PageCollection } from '@microsoft/microsoft-graph-client';
import { Channel } from '@microsoft/microsoft-graph-types';
import {
  DropdownOption,
  OAuth2PropertyValue,
  OAuth2Props,
} from '@openops/blocks-framework';
import { ChannelOption, ChatTypes } from './chat-types';
import { getMicrosoftGraphClient } from './get-microsoft-graph-client';
import { parseMsPaginatedData } from './parse-ms-paginated-data';

export async function getAllChannelOptionsByTeam(
  auth: OAuth2PropertyValue<OAuth2Props>,
  teamId: string,
): Promise<DropdownOption<ChannelOption>[]> {
  const client = getMicrosoftGraphClient(auth.access_token);

  const options: DropdownOption<ChannelOption>[] = [];

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
      options.push({
        label: channel.displayName!,
        value: { id: channel.id!, teamId: teamId, type: ChatTypes.CHANNEL },
      });
    },
  );

  return options;
}
