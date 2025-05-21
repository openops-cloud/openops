import { httpClient, HttpMethod, HttpRequest } from '@openops/blocks-common';
import { DropdownOption } from '@openops/blocks-framework';
import { AppSystemProp, system } from '@openops/server-shared';
import { ChatTypes, UserOption } from './chat-types';
import { TeamsUser } from './types';

export async function getAllUserOptions(
  tenantId: string,
): Promise<DropdownOption<UserOption>[]> {
  const request: HttpRequest = {
    method: HttpMethod.GET,
    url: `${system.get(AppSystemProp.OPENOPS_MS_TEAMS_BOT_URL)}/api/members`,
    queryParams: {
      tenantId,
    },
  };
  const response = await httpClient.sendRequest<TeamsUser[]>(request);
  return response.body.map((user: TeamsUser) => {
    const userDisplayName = user.displayName || 'Unknown User';
    const userEmail = user.email || 'Unknown Email';

    return {
      label: `${userDisplayName} (${userEmail})`,
      value: {
        id: user.id,
        type: ChatTypes.USER,
      },
    };
  });
}
