import { createAction, Property } from '@openops/blocks-framework';
import { assertNotNullOrUndefined } from '@openops/shared';
import { slackAuth } from '../common/authentication';
import { getSlackIdFromPropertyInput } from '../common/get-slack-users';
import { username, usersAndChannels } from '../common/props';
import {
  createMessageBlocks,
  dynamicBlockKitProperties,
  slackSendMessage,
} from '../common/utils';

export const slackSendMessageAction = createAction({
  auth: slackAuth,
  name: 'send_slack_message',
  displayName: 'Send Message',
  description: 'Send a message to a user or a channel',
  props: {
    conversationId: usersAndChannels,
    threadTs: Property.ShortText({
      displayName: 'Thread ts',
      description:
        'Provide the ts (timestamp) value of the **parent** message to make this message a reply. Do not use the ts value of the reply itself; use its parent instead. For example `1710304378.475129`.',
      required: false,
    }),
    username,
    file: Property.File({
      displayName: 'Attachment',
      required: false,
    }),
    blockKitEnabled: Property.Checkbox({
      displayName: 'Create your message manually using Block Kit blocks',
      description: '',
      defaultValue: false,
      required: false,
    }),
    ...dynamicBlockKitProperties(),
  },
  async run(context) {
    const token = context.auth.access_token;
    const { conversationId, username, file, threadTs } = context.propsValue;
    let text = '';
    let blocks = [];
    const isBlock = context.propsValue['blockKitEnabled'];

    assertNotNullOrUndefined(conversationId, 'conversationId');
    if (!isBlock) {
      text = context.propsValue['text']['text'];
      const headerText = context.propsValue['headerText']['headerText'];
      assertNotNullOrUndefined(text, 'text');
      blocks = createMessageBlocks(headerText, text);
    } else {
      blocks = context.propsValue['blocks']['blocks'];
    }

    const userOrChannelId = await getSlackIdFromPropertyInput(
      token,
      conversationId,
    );

    const slackSendMessageResponse = await slackSendMessage({
      token,
      text,
      username,
      conversationId: userOrChannelId,
      threadTs,
      file,
      blocks,
      eventPayload: {
        domain: context.server.publicUrl,
        isTest: context.run.isTest,
        resumeUrl: context.generateResumeUrl({
          queryParams: {
            executionCorrelationId: context.run.pauseId,
          },
        }),
      },
    });

    if (!slackSendMessageResponse.response_body.ok) {
      throw new Error(
        'Error sending message to slack: ' +
          slackSendMessageResponse.response_body.error,
      );
    }

    return slackSendMessageResponse;
  },
});
