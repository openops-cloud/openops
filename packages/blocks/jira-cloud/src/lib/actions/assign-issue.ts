import { HttpMethod } from '@openops/blocks-common';
import { createAction } from '@openops/blocks-framework';
import { jiraCloudAuth } from '../../auth';
import { sendJiraRequest } from '../common';
import {
  getIssueIdDropdown,
  getProjectIdDropdown,
  getUsersDropdown,
} from '../common/props';

export const assignIssueAction = createAction({
  auth: jiraCloudAuth,
  name: 'assign_issue',
  displayName: 'Assign Issue',
  description: 'Assigns an issue to a user',
  isWriteAction: true,
  props: {
    projectId: getProjectIdDropdown(),
    issueId: getIssueIdDropdown({ refreshers: ['projectId'] }),
    assignee: getUsersDropdown({
      displayName: 'Assignee',
      refreshers: ['projectId'],
      required: true,
    }),
  },
  async run(context) {
    const { issueId, assignee } = context.propsValue;
    const response = await sendJiraRequest({
      method: HttpMethod.PUT,
      url: `issue/${issueId}/assignee`,
      auth: context.auth,
      body: {
        accountId: assignee,
      },
    });
    return response.body;
  },
});
