import { BlockAuth, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { catchWebhook } from './lib/triggers/catch-hook';

export const webhook = createBlock({
  displayName: 'Webhook',
  description: 'Receive HTTP requests and trigger flows using unique URLs.',
  auth: BlockAuth.None(),
  categories: [BlockCategory.CORE],
  minimumSupportedRelease: '0.27.1',
  logoUrl: '/blocks/openops-webhook.svg',
  authors: ['abuaboud', 'pfernandez98'],
  actions: [],
  triggers: [catchWebhook],
});
