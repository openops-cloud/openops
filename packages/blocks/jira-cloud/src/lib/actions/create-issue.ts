import { createAction, Property } from '@openops/blocks-framework';
import { convertToStringArrayWithValidation } from '@openops/shared';
import validator, { isEmpty } from 'validator';
import { JiraAuth, jiraCloudAuth } from '../../auth';
import {
  createJiraIssue,
  getPriorities,
  JiraUser,
  searchUserByCriteria,
} from '../common';
import {
  getIssueTypeIdDropdown,
  getLabelDropdown,
  getProjectIdDropdown,
  getUsersDropdown,
} from '../common/props';

export const createIssue = createAction({
  name: 'create_issue',
  displayName: 'Create Issue',
  description: 'Create a new issue in a project',
  auth: jiraCloudAuth,
  isWriteAction: true,
  props: {
    projectId: getProjectIdDropdown(),
    issueTypeId: getIssueTypeIdDropdown({ refreshers: ['projectId'] }),
    summary: Property.ShortText({
      displayName: 'Summary',
      required: true,
    }),
    description: Property.LongText({
      displayName: 'Description',
      required: false,
    }),
    assignee: getUsersDropdown({
      displayName: 'Assignee',
      refreshers: ['projectId'],
      required: false,
    }),
    priority: Property.Dropdown({
      displayName: 'Priority',
      required: false,
      refreshers: ['auth'],
      options: async ({ auth }) => {
        if (!auth) {
          return {
            options: [],
          };
        }

        const priorities = await getPriorities({ auth: auth as JiraAuth });
        return {
          options: priorities.map((item) => {
            return {
              label: item.name,
              value: item.id,
            };
          }),
        };
      },
    }),
    parentKey: Property.ShortText({
      displayName: 'Parent Key',
      description:
        'If you would like to attach the issue to a parent, insert the parent issue key',
      required: false,
    }),
    labels: getLabelDropdown(),
  },
  run: async ({ auth, propsValue }) => {
    const {
      projectId,
      issueTypeId,
      summary,
      description,
      priority,
      parentKey,
      labels,
    } = propsValue;

    let assignee = propsValue.assignee;
    if (typeof assignee === 'string' && validator.isEmail(assignee)) {
      const resultUser: JiraUser[] = await searchUserByCriteria(auth, assignee);
      if (resultUser.length === 0) {
        throw new Error(
          `Could not find a user that matches the query ${assignee}`,
        );
      }
      assignee = resultUser[0].accountId;
    }

    return await createJiraIssue({
      auth,
      projectId: projectId as string,
      summary,
      issueTypeId,
      assignee,
      description,
      priority,
      parentKey,
      labels: !labels
        ? undefined
        : convertToStringArrayWithValidation(
            labels,
            'Labels must be a string or an array of strings',
          ),
    });
  },
});
