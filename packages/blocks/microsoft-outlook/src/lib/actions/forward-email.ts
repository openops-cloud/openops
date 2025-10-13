import { Message } from '@microsoft/microsoft-graph-types';
import { createAction, Property } from '@openops/blocks-framework';
import { getMicrosoftGraphClient } from '@openops/common';
import { microsoftOutlookAuth } from '../common/auth';
import { messageIdDropdown } from '../common/props';

export const forwardEmailAction = createAction({
  auth: microsoftOutlookAuth,
  name: 'forwardEmail',
  displayName: 'Forward Email',
  description: 'Forwards an email message.',
  IsWriteAction: true,
  props: {
    messageId: messageIdDropdown({
      displayName: 'Email',
      description: 'Select the email message to forward.',
      required: true,
    }),
    recipients: Property.Array({
      displayName: 'To Email(s)',
      required: true,
    }),
    comment: Property.LongText({
      displayName: 'Comment',
      description: 'Optional comment to include with the forwarded message.',
      required: false,
    }),
  },
  async run(context) {
    const { messageId, comment } = context.propsValue;
    const recipients = context.propsValue.recipients as string[];

    const client = getMicrosoftGraphClient(context.auth.access_token);

    const message = await client.api(`/me/messages/${messageId}`).get();

    const messagePayload: Message = {
      toRecipients: recipients.map((mail) => ({
        emailAddress: {
          address: mail,
        },
      })),
      body: {
        contentType: 'html',
        content: (comment ?? '') + '<br><br>' + message.body.content,
      },
      attachments: message.attachments,
    };

    const response = await client
      .api(`/me/messages/${messageId}/forward`)
      .post({
        message: messagePayload,
      });

    return {
      success: true,
      message: 'Email forwarded successfully.',
      messageId: response.id,
      ...response,
    };
  },
});
