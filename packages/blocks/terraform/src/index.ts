import { BlockAuth, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { deleteResourceFromTemplate } from './lib/modify/delete-resource-from-template';
import { modifyTemplate } from './lib/modify/modify-template';

export const terraform = createBlock({
  displayName: 'Terraform',
  auth: BlockAuth.None(),
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/terraform.png',
  authors: ['OpenOps'],
  categories: [BlockCategory.DEVOPS],
  actions: [modifyTemplate, deleteResourceFromTemplate],
  triggers: [],
});
