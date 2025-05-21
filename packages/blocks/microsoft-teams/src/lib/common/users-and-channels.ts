import { BlockPropValueSchema, Property } from '@openops/blocks-framework';
import { ChannelOption, ChatOption } from './chat-types';
import { getAllChannelOptionsByTeam } from './get-all-channel-options-by-team';
import { getAllTeams } from './get-all-teams';
import { getAllUserOptions } from './get-all-user-options';
import { getTenantIdFromToken } from './get-tenant-id-from-token';
import { microsoftTeamsAuth } from './microsoft-teams-auth';

export const usersAndChannels = Property.Dropdown({
  displayName: 'Channel or Chat',
  description: 'Channel or Chat to send message to.',
  refreshers: ['auth'],
  required: true,
  options: async ({ auth }) => {
    if (!auth) {
      return {
        disabled: true,
        placeholder: 'Please connect your account first and select team.',
        options: [],
      };
    }
    const authValue = auth as BlockPropValueSchema<typeof microsoftTeamsAuth>;

    const tenantId = getTenantIdFromToken(authValue.access_token);

    if (!tenantId) {
      return {
        disabled: true,
        placeholder:
          'Authentication failed. Please try again. If the problem persists, please contact support',
        options: [],
      };
    }

    const userOptions = await getAllUserOptions(tenantId);

    const teamIds = await getAllTeams(authValue);

    const channelOptions = await getAllChannelOptionsByTeam(tenantId, teamIds);

    const flattenedChannelOptions = channelOptions.flat();

    return {
      disabled: false,
      options: [...userOptions, ...flattenedChannelOptions].map((option) => ({
        label: option.label,
        value: option.value as ChatOption | ChannelOption,
      })),
    };
  },
});
