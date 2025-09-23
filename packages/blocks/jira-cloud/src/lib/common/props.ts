import { HttpMethod } from '@openops/blocks-common';
import {
  BlockPropValueSchema,
  DropdownOption,
  Property,
} from '@openops/blocks-framework';
import { getIssueTypes, getProjects, getUsers, sendJiraRequest } from '.';
import { JiraAuth, jiraCloudAuth } from '../../auth';

export function getProjectIdDropdown(data?: DropdownParams) {
  return Property.Dropdown({
    displayName: data?.displayName ?? 'Project',
    description: data?.description,
    required: data?.required ?? true,
    refreshers: data?.refreshers ?? ['auth'],
    options: async ({ auth }) => {
      if (!auth) {
        return {
          options: [],
        };
      }

      const projects = await getProjects(auth as JiraAuth);
      return {
        options: projects.map((project) => {
          return {
            label: project.name,
            value: project.id,
          };
        }),
      };
    },
  });
}

export function getIssueIdDropdown(data?: DropdownParams) {
  return Property.Dropdown({
    displayName: data?.displayName ?? 'Issue ID or Key',
    description: data?.description,
    required: data?.required ?? true,
    refreshers: data?.refreshers ?? ['projectId'],
    options: async ({ auth, projectId }) => {
      if (!auth || !projectId) {
        return {
          disabled: true,
          options: [],
        };
      }
      let nextPageToken: null | string = null;
      let isLastPage = false;
      const options: DropdownOption<string>[] = [];
      do {
        const response = await sendJiraRequest({
          method: HttpMethod.POST,
          url: 'search/jql',
          auth: auth as BlockPropValueSchema<typeof jiraCloudAuth>,
          body: {
            fields: ['summary'],
            jql: `project=${projectId}`,
            maxResults: 50,
            nextPageToken,
          },
        });
        const issueList = response.body as SearchIssuesResponse;
        options.push(
          ...issueList.issues.map((issue) => {
            return {
              label: `[${issue.key}] ${issue.fields.summary}`,
              value: issue.id,
            };
          }),
        );
        nextPageToken = issueList.nextPageToken;
        isLastPage = issueList.isLast;
      } while (!isLastPage);

      return {
        disabled: false,
        options,
      };
    },
  });
}

export function getIssueTypeIdDropdown(data?: DropdownParams) {
  return Property.Dropdown({
    displayName: data?.displayName ?? 'Issue Type',
    description: data?.description,
    required: data?.required ?? true,
    refreshers: data?.refreshers ?? ['projectId'],
    options: async ({ auth, projectId }) => {
      if (!auth || !projectId) {
        return {
          options: [],
        };
      }

      const issueTypes = await getIssueTypes({
        auth: auth as JiraAuth,
        projectId: projectId as string,
      });
      return {
        options: issueTypes.map((issueType) => {
          return {
            label: issueType.name,
            value: issueType.id,
          };
        }),
      };
    },
  });
}

export function getUsersDropdown(data?: DropdownParams) {
  return Property.Dropdown({
    displayName: data?.displayName ?? 'User',
    description: data?.description,
    required: data?.required ?? true,
    refreshers: data?.refreshers ?? [],
    options: async ({ auth }) => {
      if (!auth) {
        return {
          options: [],
        };
      }

      const users = (await getUsers(auth as JiraAuth)).filter(
        (user) => user.accountType === 'atlassian',
      );
      return {
        options: users.map((user) => {
          const labelValue: string = user.emailAddress
            ? `${user.displayName} (${user.emailAddress})`
            : user.displayName;
          return {
            label: labelValue,
            value: user.accountId,
          };
        }),
      };
    },
  });
}

export function getLabelDropdown(data?: DropdownParams) {
  return Property.MultiSelectDropdown({
    displayName: data?.displayName ?? 'Labels',
    description: data?.description,
    required: data?.required ?? false,
    refreshers: data?.refreshers ?? [],
    options: async ({ auth }) => {
      if (!auth) {
        return {
          options: [],
        };
      }

      const response = await sendJiraRequest({
        method: HttpMethod.GET,
        url: `label`,
        auth: auth as JiraAuth,
      });

      const labels = response.body['values'] ?? [];

      return {
        options: labels.map((x: any) => {
          return {
            label: x,
            value: x,
          };
        }),
      };
    },
  });
}

export interface DropdownParams {
  required?: boolean;
  refreshers?: string[];
  displayName?: string;
  description?: string;
}

export interface SearchIssuesResponse {
  isLast: boolean;
  nextPageToken: string;
  issues: Array<{
    id: string;
    key: string;
    fields: {
      summary: string;
    };
  }>;
}
