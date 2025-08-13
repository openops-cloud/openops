import { BlockAuth, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { linearCreateComment } from './lib/actions/comments/create-comment';
import { linearCreateIssue } from './lib/actions/issues/create-issue';
import { linearUpdateIssue } from './lib/actions/issues/update-issue';
import { linearCreateProject } from './lib/actions/projects/create-project';
import { linearUpdateProject } from './lib/actions/projects/update-project';
import { linearRawGraphqlQuery } from './lib/actions/raw-graphql-query';
import { linearNewIssue } from './lib/triggers/new-issue';
import { linearRemovedIssue } from './lib/triggers/removed-issue';
import { linearUpdatedIssue } from './lib/triggers/updated-issue';

const markdown = `
To obtain your API key, follow these steps:

1. Go to settings by clicking your profile-pic (top-left).
2. Click on the Security & access section in the left pane.
3. In Personal API keys section, click on the New API key to create a key.

⚠️ For a Linear event **Trigger**, you need an API key with admin permissions.`;

export const linearAuth = BlockAuth.SecretAuth({
  authProviderKey: 'Linear',
  authProviderDisplayName: 'Linear',
  authProviderLogoUrl: `https://static.openops.com/blocks/linear.png`,
  displayName: 'API Key',
  required: true,
  description: markdown,
  validate: async ({ auth }) => {
    if (auth.startsWith('lin_api_')) {
      return {
        valid: true,
      };
    }
    return {
      valid: false,
      error: 'Invalid API Key',
    };
  },
});
export const linear = createBlock({
  displayName: 'Linear',
  description: 'Issue tracking for modern software teams',

  auth: linearAuth,
  minimumSupportedRelease: '0.30.0',
  logoUrl: `https://static.openops.com/blocks/linear.png`,
  authors: ['lldiegon', 'kishanprmr', 'abuaboud'],
  categories: [BlockCategory.COLLABORATION],
  actions: [
    linearCreateIssue,
    linearUpdateIssue,
    linearCreateProject,
    linearUpdateProject,
    linearCreateComment,
    linearRawGraphqlQuery,
  ],
  triggers: [linearNewIssue, linearUpdatedIssue, linearRemovedIssue],
});
