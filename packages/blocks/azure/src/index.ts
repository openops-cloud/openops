import { createBlock } from '@openops/blocks-framework';
import { azureAuth } from '@openops/common';
import { advisorAction } from './lib/actions/azure-advisor-action';
import { azureCliAction } from './lib/actions/azure-cli-action';

export const azure = createBlock({
  displayName: 'Azure',
  auth: azureAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/azure.svg',
  authors: [],
  actions: [azureCliAction, advisorAction],
  triggers: [],
});
