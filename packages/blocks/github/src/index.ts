import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, OAuth2PropertyValue } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { createPullRequestAction } from './lib/actions/create-pull-request-action';
import { getFileAction } from './lib/actions/get-file-action';
import { runWorkflowAction } from './lib/actions/run-workflow-action';
import { auth } from './lib/common/auth';

export const github = createBlock({
  displayName: 'Github',
  auth: auth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: '/blocks/github.png',
  authors: [],
  actions: [
    getFileAction,
    createPullRequestAction,
    runWorkflowAction,
    createCustomApiCallAction({
      baseUrl: () => 'https://api.github.com',
      auth: auth,
      authMapping: async (context: any) => ({
        Authorization: `Bearer ${
          (context.auth as OAuth2PropertyValue).access_token
        }`,
      }),
    }),
  ],
  categories: [BlockCategory.DEVOPS],
  triggers: [],
});
