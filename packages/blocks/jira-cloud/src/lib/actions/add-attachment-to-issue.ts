import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import FormData from 'form-data';
import { jiraCloudAuth } from '../../auth';
import { sendJiraRequest } from '../common';
import { getIssueIdDropdown, getProjectIdDropdown } from '../common/props';

export const addAttachmentToIssueAction = createAction({
  auth: jiraCloudAuth,
  name: 'add_issue_attachment',
  displayName: 'Add Attachment to Issue',
  description: 'Adds an attachment to an issue.',
  isWriteAction: true,
  props: {
    projectId: getProjectIdDropdown(),
    issueId: getIssueIdDropdown({ refreshers: ['projectId'] }),
    attachment: Property.File({
      displayName: 'Attachment',
      required: true,
    }),
  },
  async run(context) {
    const { issueId, attachment } = context.propsValue;
    const formData = new FormData();
    const fileBuffer = Buffer.from(attachment.base64, 'base64');
    formData.append('file', fileBuffer, attachment.filename);

    const response = await sendJiraRequest({
      method: HttpMethod.POST,
      url: `issue/${issueId}/attachments`,
      auth: context.auth,
      headers: {
        'X-Atlassian-Token': 'no-check',
        ...formData.getHeaders(),
      },
      body: formData,
    });
    return response.body;
  },
});
