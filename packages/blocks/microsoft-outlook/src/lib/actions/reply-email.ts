import { PageCollection } from '@microsoft/microsoft-graph-client';
import { Message } from '@microsoft/microsoft-graph-types';
import {
  createAction,
  OAuth2PropertyValue,
  Property,
  WorkflowFile,
} from '@openops/blocks-framework';
import { getMicrosoftGraphClient } from '@openops/common';
import { microsoftOutlookAuth } from '../common/auth';

export const replyEmailAction = createAction({
  auth: microsoftOutlookAuth,
  name: 'reply-email',
  displayName: 'Reply to Email',
  description: 'Reply to an outlook email.',
  isWriteAction: true,
  props: {
    messageId: Property.Dropdown({
      displayName: 'Email',
      description: 'Select the email message to reply to.',
      required: true,
      refreshers: ['auth'],
      options: async ({ auth }) => {
        if (!auth) {
          return {
            disabled: true,
            options: [],
          };
        }

        const client = getMicrosoftGraphClient(
          (auth as OAuth2PropertyValue).access_token,
        );

        try {
          const response: PageCollection = await client
            .api(
              '/me/messages?$top=50&$select=id,subject,from,receivedDateTime',
            )
            .orderby('receivedDateTime desc')
            .get();

          const messages = response.value as Message[];

          return {
            disabled: false,
            options: messages.map((message) => ({
              label: `${message.subject || 'No Subject'} - ${
                message.from?.emailAddress?.name ||
                message.from?.emailAddress?.address ||
                'Unknown Sender'
              }`,
              value: message.id || '',
            })),
          };
        } catch (error) {
          return {
            disabled: true,
            options: [],
          };
        }
      },
    }),
    bodyFormat: Property.StaticDropdown({
      displayName: 'Body Format',
      required: true,
      defaultValue: 'text',
      options: {
        disabled: false,
        options: [
          { label: 'HTML', value: 'html' },
          { label: 'Text', value: 'text' },
        ],
      },
    }),
    replyBody: Property.LongText({
      displayName: 'Reply Body',
      required: true,
    }),
    ccRecipients: Property.Array({
      displayName: 'CC Recipients',
      required: false,
    }),
    bccRecipients: Property.Array({
      displayName: 'BCC Recipients',
      required: false,
    }),
    attachments: Property.Array({
      displayName: 'Attachments',
      required: false,
      defaultValue: [],
      properties: {
        file: Property.File({
          displayName: 'File',
          required: true,
        }),
        fileName: Property.ShortText({
          displayName: 'File Name',
          required: false,
        }),
      },
    }),
    draft: Property.Checkbox({
      displayName: 'Create Draft',
      description: 'If enabled, creates draft without sending.',
      required: true,
      defaultValue: false,
    }),
  },
  async run(context) {
    const { replyBody, bodyFormat, messageId, draft } = context.propsValue;
    const ccRecipients = context.propsValue.ccRecipients as string[];
    const bccRecipients = context.propsValue.bccRecipients as string[];
    const attachments = context.propsValue.attachments as Array<{
      file: WorkflowFile;
      fileName: string;
    }>;

    const formattedReplyBody =
      bodyFormat === 'text'
        ? `<pre style="font-family: inherit; white-space: pre-wrap;">${replyBody
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')}</pre>`
        : replyBody;

    const mailPayload: Message = {
      ccRecipients: ccRecipients.map((mail) => ({
        emailAddress: {
          address: mail,
        },
      })),
      bccRecipients: bccRecipients.map((mail) => ({
        emailAddress: {
          address: mail,
        },
      })),
      attachments: attachments.map((attachment) => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachment.fileName || attachment.file.filename,
        contentBytes: attachment.file.base64,
      })),
    };
    const client = getMicrosoftGraphClient(context.auth.access_token);

    try {
      const response: Message = await client
        .api(`/me/messages/${messageId}/createReply`)
        .post({
          comment: formattedReplyBody,
          message: mailPayload,
        });
      const draftId = response.id;

      if (!draft) {
        await client.api(`/me/messages/${draftId}/send`).post({});
        return {
          success: true,
          message: 'Reply sent successfully.',
          draftId: draftId,
        };
      }
      return {
        success: true,
        message: 'Draft created successfully.',
        draftId: draftId,
        draftLink: `https://outlook.office.com/mail/drafts/id/${draftId}`,
      };
    } catch (error) {
      console.error('Reply Email Error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(errorMessage);
    }
  },
});
