import { createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { createPullRequestAction } from './lib/actions/create-pull-request-action';
import { getFileAction } from './lib/actions/get-file-action';
import { runWorkflowAction } from './lib/actions/run-workflow-action';
import { auth } from './lib/common/auth';

export const github = createBlock({
  displayName: 'Github',
  auth: auth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/github.png',
  authors: [],
  actions: [getFileAction, createPullRequestAction, runWorkflowAction],
  categories: [BlockCategory.DEVOPS],
  triggers: [],
});
