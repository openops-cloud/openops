import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { JiraAuth, jiraCloudAuth } from '../../auth';
import { sendJiraRequest } from '../common';
import { getIssueIdDropdown, getProjectIdDropdown } from '../common/props';

export const transitionIssueAction = createAction({
  auth: jiraCloudAuth,
  name: 'transition_issue',
  displayName: 'Change Issue Status',
  description: 'Change the status of a given issue',
  isWriteAction: true,
  props: {
    projectId: getProjectIdDropdown(),
    issueId: getIssueIdDropdown({ refreshers: ['projectId'] }),
    newStatus: Property.Dropdown({
      displayName: 'New Status',
      refreshers: ['issueId'],
      required: true,
      options: async ({ auth, issueId }) => {
        if (!auth || !issueId) {
          return {
            disabled: true,
            options: [],
            placeholder: 'Please authenticate and select an issue',
          };
        }

        const response = await sendJiraRequest({
          method: HttpMethod.GET,
          url: `issue/${issueId}/transitions`,
          auth: auth as JiraAuth,
        });
        return {
          disabled: false,
          options: response.body['transitions'].map((x: any) => {
            return {
              label: x.name,
              value: x.id,
            };
          }),
        };
      },
    }),
  },
  async run(context) {
    const { issueId, newStatus } = context.propsValue;

    const response = await sendJiraRequest({
      method: HttpMethod.POST,
      url: `issue/${issueId}/transitions`,
      auth: context.auth,
      body: {
        transition: { id: newStatus },
      },
    });

    return response.body;
  },
});
