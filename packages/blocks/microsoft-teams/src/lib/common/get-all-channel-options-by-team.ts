import { httpClient, HttpMethod, HttpRequest } from '@openops/blocks-common';
import { DropdownOption } from '@openops/blocks-framework';
import { AppSystemProp, system } from '@openops/server-shared';
import { ChannelOption, ChatTypes } from './chat-types';
import { TeamsChannel } from './types';

export async function getAllChannelOptionsByTeam(
  tenantId: string,
  teamIds: string[],
): Promise<DropdownOption<ChannelOption>[]> {
  const request: HttpRequest = {
    method: HttpMethod.GET,
    url: `${system.get(AppSystemProp.OPENOPS_MS_TEAMS_BOT_URL)}/api/channels`,
    queryParams: {
      tenantId,
      teamIds: teamIds.join(','),
    },
  };

  const response = await httpClient.sendRequest<TeamsChannel[]>(request);
  return response.body.map((channel: TeamsChannel) => {
    return {
      label: `${channel.displayName ?? 'General'} (${channel.teamName})`,
      value: { id: channel.id, type: ChatTypes.CHANNEL },
    };
  });
}
