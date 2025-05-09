import {
  AuthenticationType,
  httpClient,
  HttpError,
  HttpMessageBody,
  HttpMethod,
  HttpRequest,
  QueryParams,
} from '@openops/blocks-common';
import { JiraAuth } from '../../auth';

export async function sendJiraRequest(
  request: HttpRequest & { auth: JiraAuth },
) {
  try {
    return await httpClient.sendRequest({
      ...request,
      url: `${request.auth.instanceUrl}/rest/api/3/${request.url}`,
      authentication: {
        type: AuthenticationType.BASIC,
        username: request.auth.email,
        password: request.auth.apiToken,
      },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      const errorBody = e.response?.body ?? {};
      const fullError = JSON.stringify(errorBody);

      if (
        fullError.includes('It is not on the appropriate screen, or unknown.')
      ) {
        throw Error(
          `One or more fields you're trying to set is not configured on the project's create/edit screen. You need to add it in Jira's screen settings.\n\nOriginal error: ${fullError}`,
        );
      }

      throw Error(fullError);
    }

    throw e;
  }
}

export async function getUsers(auth: JiraAuth) {
  const response = await sendJiraRequest({
    url: 'users/search',
    method: HttpMethod.GET,
    auth: auth,
    queryParams: {
      maxResults: '1000',
    },
  });

  return response.body as any[];
}

export async function searchUserByCriteria(
  auth: JiraAuth,
  queryValue: string,
): Promise<JiraUser[]> {
  const response = await sendJiraRequest({
    url: `user/search?query=${queryValue}`,
    method: HttpMethod.GET,
    auth: auth,
  });
  return response.body.length === 0 ? [] : (response.body as JiraUser[]);
}

export async function getProjects(auth: JiraAuth): Promise<JiraProject[]> {
  const response = await sendJiraRequest({
    url: 'project/search',
    method: HttpMethod.GET,
    auth: auth,
  });

  return (response.body as any).values as JiraProject[];
}

export async function getIssueTypes({
  auth,
  projectId,
}: {
  auth: JiraAuth;
  projectId: string;
}) {
  const response = await sendJiraRequest({
    url: 'issuetype/project',
    method: HttpMethod.GET,
    auth: auth,
    queryParams: {
      projectId,
    },
  });

  return response.body as any[];
}

export async function getPriorities({ auth }: { auth: JiraAuth }) {
  const response = await sendJiraRequest({
    url: 'priority',
    method: HttpMethod.GET,
    auth: auth,
  });

  return response.body as any[];
}

export async function executeJql({
  auth,
  jql,
  sanitizeJql,
  url,
  method,
  queryParams,
  body,
}: {
  auth: JiraAuth;
  jql: string;
  sanitizeJql: boolean;
  url: string;
  method: HttpMethod;
  queryParams?: QueryParams;
  body?: HttpMessageBody;
}) {
  let reqJql = jql;
  if (sanitizeJql) {
    const sanitizeResult = (
      await sendJiraRequest({
        auth: auth,
        url: 'jql/sanitize',
        method: HttpMethod.POST,
        body: {
          queries: [
            {
              query: jql,
            },
          ],
        },
      })
    ).body as {
      queries: {
        initialQuery: string;
        sanitizedQuery: string;
      }[];
    };
    reqJql = sanitizeResult.queries[0].sanitizedQuery;
  }

  const response = await sendJiraRequest({
    auth,
    url,
    method,
    body: {
      ...body,
      jql: reqJql,
    },
    queryParams,
  });
  return response.body;
}

export async function searchIssuesByJql({
  auth,
  jql,
  maxResults,
  sanitizeJql,
}: {
  auth: JiraAuth;
  jql: string;
  maxResults: number;
  sanitizeJql: boolean;
}) {
  return (
    (await executeJql({
      auth,
      url: 'search',
      method: HttpMethod.POST,
      jql,
      body: {
        maxResults,
      },
      sanitizeJql,
    })) as { issues: any[] }
  ).issues;
}

export async function createJiraIssue(data: CreateIssueParams) {
  const fields: any = {
    project: {
      id: data.projectId,
    },
    summary: data.summary,
    issuetype: {
      id: data.issueTypeId,
    },
  };
  if (data.assignee) fields.assignee = { id: data.assignee };
  if (data.priority) fields.priority = { id: data.priority };
  if (data.description)
    fields.description = {
      content: [
        {
          content: [
            {
              text: data.description,
              type: 'text',
            },
          ],
          type: 'paragraph',
        },
      ],
      type: 'doc',
      version: 1,
    };
  if (data.parentKey) {
    fields.parent = { key: data.parentKey };
  }
  if (data.labels) {
    fields.labels = data.labels;
  }
  const response = await sendJiraRequest({
    url: 'issue',
    method: HttpMethod.POST,
    auth: data.auth,
    body: {
      fields: fields,
    },
  });

  return response.body;
}

export async function updateJiraIssue(data: UpdateIssueParams) {
  const fields: any = {};
  if (data.summary) fields.summary = data.summary;
  if (data.issueTypeId) fields.issuetype = { id: data.issueTypeId };
  if (data.assignee) fields.assignee = { id: data.assignee };
  if (data.priority) fields.priority = { id: data.priority };
  if (data.description)
    fields.description = {
      content: [
        {
          content: [
            {
              text: data.description,
              type: 'text',
            },
          ],
          type: 'paragraph',
        },
      ],
      type: 'doc',
      version: 1,
    };
  if (data.parentKey) {
    fields.parent = { key: data.parentKey };
  }
  if (data.labels) {
    fields.labels = data.labels;
  }
  const response = await sendJiraRequest({
    url: `issue/${data.issueId}`,
    method: HttpMethod.PUT,
    auth: data.auth,
    queryParams: {
      returnIssue: 'true',
    },
    body: {
      fields: fields,
    },
  });
  return response.body;
}
export interface JiraIssueType {
  id: string;
  description: string;
  name: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  expand: string;
  self: string;
  projectTypeKey: string;
  simplified: boolean;
  style: string;
  isPrivate: boolean;
  properties: any;
}

export interface CreateIssueParams {
  auth: JiraAuth;
  projectId: string;
  summary: string;
  description?: string;
  issueTypeId: string;
  assignee?: string;
  priority?: string;
  parentKey?: string;
  labels?: string[];
}

export interface UpdateIssueParams {
  auth: JiraAuth;
  issueId?: string;
  summary?: string;
  description?: string;
  issueTypeId: string;
  assignee?: string;
  priority?: string;
  parentKey?: string;
  labels?: string[];
}

export interface JiraUser {
  accountId: string;
  accountType: string;
  active: boolean;
  displayName: string;
  emailAddress: string;
  locate: string;
  self: string;
  timeZone: string;
}
