import { LinearDocument } from '@linear/sdk';
import { Property } from '@openops/blocks-framework';
import { makeClient } from './client';

type PaginatedResponse<T> = {
  nodes: T[] | Promise<T[]>;
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string;
  };
};

async function fetchAllPaginatedItems<T>(
  fetchPage: (cursor?: string) => Promise<PaginatedResponse<T>>,
): Promise<T[]> {
  const allItems: T[] = [];
  let hasNextPage = true;
  let cursor: string | undefined;

  while (hasNextPage) {
    const response = await fetchPage(cursor);
    const nodes = await response.nodes;
    allItems.push(...nodes);

    hasNextPage = response.pageInfo.hasNextPage;
    cursor = response.pageInfo.endCursor;
  }

  return allItems;
}

export const props = {
  team_id: (required = true) =>
    Property.Dropdown({
      description:
        'The team for which the issue, project or comment will be created',
      displayName: 'Team',
      required,
      refreshers: ['auth'],
      options: async ({ auth }) => {
        if (!auth) {
          return {
            disabled: true,
            placeholder: 'connect your account first',
            options: [],
          };
        }
        const client = makeClient(auth as string);
        const allTeams = await fetchAllPaginatedItems((cursor) =>
          client.listTeams({
            orderBy: LinearDocument.PaginationOrderBy.UpdatedAt,
            first: 100,
            after: cursor,
          }),
        );

        return {
          disabled: false,
          options: allTeams.map((team) => ({
            label: team.name,
            value: team.id,
          })),
        };
      },
    }),

  status_id: (required = false) =>
    Property.Dropdown({
      description: 'Status of the Issue',
      displayName: 'Status',
      required,
      refreshers: ['auth', 'team_id'],
      options: async ({ auth, team_id }) => {
        if (!auth || !team_id) {
          return {
            disabled: true,
            placeholder: 'connect your account first and select team',
            options: [],
          };
        }
        const client = makeClient(auth as string);
        const filter: LinearDocument.WorkflowStatesQueryVariables['filter'] = {
          team: { id: { eq: team_id as string } },
        };

        const allStates = await fetchAllPaginatedItems((cursor) =>
          client.listIssueStates({ filter, first: 100, after: cursor }),
        );

        return {
          disabled: false,
          options: allStates.map((status) => ({
            label: status.name,
            value: status.id,
          })),
        };
      },
    }),

  labels: (required = false) =>
    Property.MultiSelectDropdown({
      description: 'Labels for the Issue',
      displayName: 'Labels',
      required,
      refreshers: ['auth', 'team_id'],
      options: async ({ auth, team_id }) => {
        if (!auth || !team_id) {
          return {
            disabled: true,
            placeholder: 'connect your account first and select team',
            options: [],
          };
        }
        const client = makeClient(auth as string);
        const allLabels = await fetchAllPaginatedItems((cursor) =>
          client.listIssueLabels({
            filter: {
              team: {
                id: {
                  eq: team_id as string,
                },
              },
            },
            orderBy: LinearDocument.PaginationOrderBy.UpdatedAt,
            first: 100,
            after: cursor,
          }),
        );

        return {
          disabled: false,
          options: allLabels.map((label) => ({
            label: label.name,
            value: label.id,
          })),
        };
      },
    }),

  assignee_id: (required = false) =>
    Property.Dropdown({
      description: 'Assignee of the Issue / Comment',
      displayName: 'Assignee',
      required,
      refreshers: ['auth'],
      options: async ({ auth }) => {
        if (!auth) {
          return {
            disabled: true,
            placeholder: 'connect your account first',
            options: [],
          };
        }
        const client = makeClient(auth as string);
        const allUsers = await fetchAllPaginatedItems((cursor) =>
          client.listUsers({
            orderBy: LinearDocument.PaginationOrderBy.UpdatedAt,
            first: 100,
            after: cursor,
          }),
        );

        return {
          disabled: false,
          options: allUsers.map((user) => ({
            label: user.name,
            value: user.id,
          })),
        };
      },
    }),

  priority_id: (required = false) =>
    Property.Dropdown({
      description: 'Priority of the Issue',
      displayName: 'Priority',
      required,
      refreshers: ['auth'],
      options: async ({ auth }) => {
        if (!auth) {
          return {
            disabled: true,
            placeholder: 'connect your account first',
            options: [],
          };
        }
        const client = makeClient(auth as string);
        const priorities = await client.listIssuePriorities();

        return {
          disabled: false,
          options: priorities.map((priority: { label: any; priority: any }) => {
            return {
              label: priority.label,
              value: priority.priority,
            };
          }),
        };
      },
    }),

  issue_id: (required = true) =>
    Property.Dropdown({
      displayName: 'Issue',
      required,
      description: 'ID of Linear Issue',
      refreshers: ['team_id'],
      options: async ({ auth, team_id }) => {
        if (!auth || !team_id) {
          return {
            disabled: true,
            placeholder: 'connect your account first and select team',
            options: [],
          };
        }
        const client = makeClient(auth as string);
        const filter: LinearDocument.IssuesQueryVariables = {
          first: 50,
          filter: {
            team: {
              id: {
                eq: team_id as string,
              },
            },
          },
          orderBy: LinearDocument.PaginationOrderBy.UpdatedAt,
        };
        const issues = await client.listIssues(filter);
        return {
          disabled: false,
          options: issues.nodes.map((issue: { title: any; id: any }) => {
            return {
              label: issue.title,
              value: issue.id,
            };
          }),
        };
      },
    }),

  project_id: (required = true) =>
    Property.Dropdown({
      displayName: 'Project',
      required,
      description: 'ID of Linear Project',
      refreshers: ['team_id'],
      options: async ({ auth, team_id }) => {
        if (!auth || !team_id) {
          return {
            disabled: true,
            placeholder: 'connect your account first and select team',
            options: [],
          };
        }
        const client = makeClient(auth as string);
        const allProjects = await fetchAllPaginatedItems((cursor) =>
          client.listProjects({
            orderBy: LinearDocument.PaginationOrderBy.UpdatedAt,
            first: 100,
            after: cursor,
          }),
        );

        return {
          disabled: false,
          options: allProjects.map((project) => ({
            label: project.name,
            value: project.id,
          })),
        };
      },
    }),

  template_id: (required = false) =>
    Property.Dropdown({
      displayName: 'Template',
      required,
      description: 'ID of Template',
      refreshers: ['auth', 'team_id'],
      options: async ({ auth, team_id }) => {
        if (!auth || !team_id) {
          return {
            disabled: true,
            placeholder: 'connect your account first and select team',
            options: [],
          };
        }
        const client = makeClient(auth as string);
        const allTemplates = await fetchAllPaginatedItems((cursor) =>
          client.listTeamsTemplates(team_id as string, {
            first: 100,
            after: cursor,
            orderBy: LinearDocument.PaginationOrderBy.UpdatedAt,
          }),
        );

        return {
          disabled: false,
          options: allTemplates.map((template) => ({
            label: template.name,
            value: template.id,
          })),
        };
      },
    }),
};
