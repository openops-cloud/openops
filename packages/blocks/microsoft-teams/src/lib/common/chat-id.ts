import { BlockPropValueSchema, Property } from '@openops/blocks-framework';
import { getAllChatOptions } from './get-all-chat-options';
import { microsoftTeamsAuth } from './microsoft-teams-auth';

export const chatId = Property.Dropdown({
  displayName: 'Chat ID',
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

    const options = await getAllChatOptions(authValue);

    return {
      disabled: false,
      options: options,
    };
  },
});
