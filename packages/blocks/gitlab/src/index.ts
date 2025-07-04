import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { createFileAction } from './lib/actions/create-file-action';
import { createMergeRequestAction } from './lib/actions/create-merge-request-action';
import { getFileAction } from './lib/actions/get-file-action';
import { listProjectsAction } from './lib/actions/list-projects-action';
import { auth } from './lib/common/auth';

export const gitlab = createBlock({
  displayName: 'GitLab',
  auth: auth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/gitlab.png',
  categories: [BlockCategory.DEVOPS],
  authors: [],
  actions: [
    listProjectsAction,
    getFileAction,
    createFileAction,
    createMergeRequestAction,
    createCustomApiCallAction({
      baseUrl: () => 'https://gitlab.com/api/v4',
      auth: auth,
      authMapping: async (context: any) => ({
        Authorization: `Bearer ${context.auth}`,
      }),
    }),
  ],
  triggers: [],
});