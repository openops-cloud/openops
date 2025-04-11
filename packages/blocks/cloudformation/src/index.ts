import { createBlock } from '@openops/blocks-framework';
import { amazonAuth } from '@openops/common';
import { BlockCategory } from '@openops/shared';
import { getStack } from './lib/get/get-stack';
import { deleteResourceFromTemplate } from './lib/modify/delete-resource-from-template';
import { modifyTemplate } from './lib/modify/modify-template';
import { updateStack } from './lib/update/update-stack';

export const cloudformation = createBlock({
  displayName: 'AWS CloudFormation',
  auth: amazonAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/cloudformation.png',
  authors: ['OpenOps'],
  categories: [BlockCategory.DEVOPS, BlockCategory.CLOUD],
  actions: [getStack, updateStack, modifyTemplate, deleteResourceFromTemplate],
  triggers: [],
});
