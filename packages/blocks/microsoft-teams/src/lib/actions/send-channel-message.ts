import { createAction, Property } from '@openops/blocks-framework';
import { channelId } from '../common/channel-id';
import { getMicrosoftGraphClient } from '../common/get-microsoft-graph-client';
import { microsoftTeamsAuth } from '../common/microsoft-teams-auth';
import { teamId } from '../common/team-id';

export const sendChannelMessageAction = createAction({
  auth: microsoftTeamsAuth,
  name: 'microsoft_teams_send_channel_message',
  displayName: 'Send Channel Message',
  description: "Sends a message to a teams's channel.",
  props: {
    teamId: teamId,
    channelId: channelId,
    contentType: Property.StaticDropdown({
      displayName: 'Content Type',
      required: true,
      defaultValue: 'text',
      options: {
        disabled: false,
        options: [
          {
            label: 'Text',
            value: 'text',
          },
          {
            label: 'HTML',
            value: 'html',
          },
        ],
      },
    }),
    content: Property.LongText({
      displayName: 'Message',
      required: true,
    }),
  },
  async run(context) {
    const { teamId, channelId, contentType, content } = context.propsValue;

    const client = getMicrosoftGraphClient(context.auth.access_token);

    //https://learn.microsoft.com/en-us/graph/api/channel-post-messages?view=graph-rest-1.0&tabs=http
    const chatMessage = {
      body: {
        content: content,
        contentType: contentType,
      },
    };

    return await client
      .api(`/teams/${teamId}/channels/${channelId}/messages`)
      .post(chatMessage);
  },
});
