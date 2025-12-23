import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { JiraAuth, jiraCloudAuth } from './auth';
import { addAttachmentToIssueAction } from './lib/actions/add-attachment-to-issue';
import { addCommentToIssueAction } from './lib/actions/add-comment-to-issue';
import { assignIssueAction } from './lib/actions/assign-issue';
import { createIssue } from './lib/actions/create-issue';
import { deleteIssueCommentAction } from './lib/actions/delete-issue-comment';
import { listIssueCommentsAction } from './lib/actions/list-issue-comments';
import { searchIssues } from './lib/actions/search-issues';
import { transitionIssueAction } from './lib/actions/transition-issue';
import { updateIssueAction } from './lib/actions/update-issue';
import { updateIssueCommentAction } from './lib/actions/update-issue-comment';
import { newIssue } from './lib/triggers/new-issue';
import { updatedIssue } from './lib/triggers/updated-issue';

export const jiraCloud = createBlock({
  displayName: 'Jira Cloud',
  description: 'Issue tracking and project management',

  auth: jiraCloudAuth,
  minimumSupportedRelease: '0.9.0',
  logoUrl: '/blocks/jira.png',
  categories: [BlockCategory.COLLABORATION],
  authors: ['kishanprmr', 'MoShizzle', 'abuaboud'],
  actions: [
    createIssue,
    updateIssueAction,
    transitionIssueAction,
    searchIssues,
    assignIssueAction,
    addAttachmentToIssueAction,
    addCommentToIssueAction,
    updateIssueCommentAction,
    listIssueCommentsAction,
    deleteIssueCommentAction,
    createCustomApiCallAction({
      baseUrl: (auth) => {
        return `${(auth as JiraAuth).instanceUrl}/rest/api/3`;
      },
      auth: jiraCloudAuth,
      authMapping: async (context) => {
        const jiraAuth = context.auth as JiraAuth;
        const credentials = `${jiraAuth.email}:${jiraAuth.apiToken}`;
        const encoded = Buffer.from(credentials).toString('base64');
        return {
          Authorization: `Basic ${encoded}`,
        };
      },
    }),
  ],
  triggers: [newIssue, updatedIssue],
});
