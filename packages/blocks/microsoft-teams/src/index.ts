import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, OAuth2PropertyValue } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { sendChannelMessageAction } from './lib/actions/send-channel-message';
import { sendChatMessageAction } from './lib/actions/send-chat-message';
import { microsoftTeamsAuth } from './lib/common/microsoft-teams-auth';

export const microsoftTeams = createBlock({
  displayName: 'Microsoft Teams',
  auth: microsoftTeamsAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/microsoft-teams.png',
  categories: [BlockCategory.COMMUNICATION],
  authors: [],
  actions: [
    sendChannelMessageAction,
    sendChatMessageAction,
    createCustomApiCallAction({
      auth: microsoftTeamsAuth,
      baseUrl: () => 'https://graph.microsoft.com/v1.0/',
      authMapping: async (auth) => ({
        Authorization: `Bearer ${(auth as OAuth2PropertyValue).access_token}`,
      }),
    }),
  ],
  triggers: [],
});
