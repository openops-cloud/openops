import { createCustomApiCallAction } from '@openops/blocks-common';
import {
  createblock,
  OAuth2PropertyValue,
  blockAuth,
} from '@openops/blocks-framework';
import { blockCategory } from '@openops/shared';
import { createIssueAction } from './lib/actions/create-issue-action';
import { issuesEventTrigger } from './lib/trigger/issue-event';

export const gitlabAuth = blockAuth.OAuth2({
  required: true,
  authUrl: 'https://gitlab.com/oauth/authorize',
  tokenUrl: 'https://gitlab.com/oauth/token',
  scope: ['api', 'read_user'],
});

export const gitlab = createblock({
  displayName: 'GitLab',
  description: 'Collaboration tool for developers',

  auth: gitlabAuth,
  minimumSupportedRelease: '0.30.0',
  logoUrl: 'https://cdn.openops.com/blocks/gitlab.png',
  categories: [blockCategory.DEVELOPER_TOOLS],
  authors: ["kishanprmr","MoShizzle","khaledmashaly","abuaboud"],
  actions: [
    createIssueAction,
    createCustomApiCallAction({
      baseUrl: () => 'https://gitlab.com/api/v4',
      auth: gitlabAuth,
      authMapping: async (auth) => ({
        Authorization: `Bearer ${(auth as OAuth2PropertyValue).access_token}`,
      }),
    }),
  ],
  triggers: [issuesEventTrigger],
});
