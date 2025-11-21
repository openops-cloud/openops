import { createAction, Property } from '@openops/blocks-framework';
import { slackAuth } from '../common/authentication';
import { blocks, slackChannel } from '../common/props';
import { slackUpdateMessage } from '../common/utils';

export const updateMessageAction = createAction({
  name: 'updateMessage',
  displayName: 'Update Message',
  description: 'Update an existing message',
  auth: slackAuth,
  isWriteAction: true,
  props: {
    channel: slackChannel,
    ts: Property.ShortText({
      displayName: 'Message Timestamp',
      description:
        'Please provide the timestamp of the message you wish to update, such as `1710304378.475129`',
      required: true,
    }),
    text: Property.LongText({
      displayName: 'Message',
      description: 'The updated text of your message',
      required: true,
    }),
    blocks,
  },
  async run({ auth, propsValue }) {
    const slackSendMessageResponse = await slackUpdateMessage({
      token: auth.access_token,
      conversationId: propsValue.channel,
      text: propsValue.text,
      blocks: propsValue.blocks as any,
      messageTimestamp: propsValue.ts,
      metadata: {
        event_type: 'slack-message',
      },
    });

    if (!slackSendMessageResponse.response_body.ok) {
      throw new Error(
        'Error updating Slack message: ' +
          slackSendMessageResponse.response_body.error,
      );
    }

    return slackSendMessageResponse;
  },
});
