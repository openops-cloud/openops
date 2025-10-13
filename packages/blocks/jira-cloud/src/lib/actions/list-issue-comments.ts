import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { jiraCloudAuth } from '../../auth';
import { sendJiraRequest } from '../common';
import { getIssueIdDropdown, getProjectIdDropdown } from '../common/props';

export const listIssueCommentsAction = createAction({
  auth: jiraCloudAuth,
  name: 'list_issue_comments',
  displayName: 'List Issue Comments',
  description: 'Returns all comments for an issue.',
  requireToolApproval: false,
  props: {
    projectId: getProjectIdDropdown(),
    issueId: getIssueIdDropdown({ refreshers: ['projectId'] }),
    orderBy: Property.StaticDropdown({
      displayName: 'Order By',
      required: true,
      defaultValue: '-created',
      options: {
        disabled: false,
        options: [
          {
            label: 'Created (Descending)',
            value: '-created',
          },
          {
            label: 'Created (Ascending)',
            value: '+created',
          },
        ],
      },
    }),
    limit: Property.Number({
      displayName: 'Limit',
      description: 'Maximum number of results',
      required: true,
      defaultValue: 10,
    }),
  },
  async run(context) {
    const { issueId, orderBy, limit } = context.propsValue;

    const response = await sendJiraRequest({
      method: HttpMethod.GET,
      url: `issue/${issueId}/comment`,
      auth: context.auth,
      queryParams: {
        orderBy: orderBy,
        maxResults: limit.toString(),
        expand: 'renderedBody',
      },
    });
    return response.body;
  },
});
