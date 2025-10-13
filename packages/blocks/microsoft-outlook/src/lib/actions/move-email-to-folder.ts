import { createAction } from '@openops/blocks-framework';
import { getMicrosoftGraphClient } from '@openops/common';
import { microsoftOutlookAuth } from '../common/auth';
import { mailFolderIdDropdown, messageIdDropdown } from '../common/props';

export const moveEmailToFolderAction = createAction({
  auth: microsoftOutlookAuth,
  name: 'moveEmailToFolder',
  displayName: 'Move Email to Folder',
  description: 'Moves an email message to a specific folder.',
  IsWriteAction: true,
  props: {
    messageId: messageIdDropdown({
      displayName: 'Email',
      description: 'Select the email message to move.',
      required: true,
    }),
    destinationFolderId: mailFolderIdDropdown({
      displayName: 'Destination Folder',
      description: 'The folder to move the email to.',
      required: true,
    }),
  },
  async run(context) {
    const { messageId, destinationFolderId } = context.propsValue;

    const client = getMicrosoftGraphClient(context.auth.access_token);

    const response = await client.api(`/me/messages/${messageId}/move`).post({
      destinationId: destinationFolderId,
    });

    return response;
  },
});
