import { createCustomApiCallAction } from '@openops/blocks-common';
import { BlockAuth, Property, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { newTicketInView } from './lib/trigger/new-ticket-in-view';

const markdownProperty = `
**Organization**: The organization name can be found in the URL (e.g https://ORGANIZATION_NAME.zendesk.com).

**Agent Email**: The email you use to log in to Zendesk.

**API Token**: You can find this in the Zendesk Admin Panel under Settings > APIs > Zendesk API.
`;

export const zendeskAuth = BlockAuth.CustomAuth({
  authProviderKey: 'zendesk',
  authProviderDisplayName: 'Zendesk',
  authProviderLogoUrl: 'https://static.openops.com/blocks/zendesk.png',
  description: markdownProperty,
  required: true,
  props: {
    email: Property.ShortText({
      displayName: 'Agent Email',
      description: 'The email address you use to login to Zendesk',
      required: true,
    }),
    token: Property.SecretText({
      displayName: 'Token',
      description: 'The API token you can generate in Zendesk',
      required: true,
    }),
    subdomain: Property.ShortText({
      displayName: 'Organization (e.g activeblockshelp)',
      description: 'The subdomain of your Zendesk instance',
      required: true,
    }),
  },
});

export const zendesk = createBlock({
  displayName: 'Zendesk',
  description: 'Customer service software and support ticket system',

  minimumSupportedRelease: '0.30.0',
  logoUrl: 'https://static.openops.com/blocks/zendesk.png',
  authors: ['kishanprmr', 'MoShizzle', 'khaledmashaly', 'abuaboud'],
  categories: [BlockCategory.COLLABORATION],
  auth: zendeskAuth,
  actions: [
    createCustomApiCallAction({
      baseUrl: (auth) => {
        const { subdomain } = auth as unknown as { subdomain: string };
        return `https://${subdomain}.zendesk.com/api/v2`;
      },
      auth: zendeskAuth,
      authMapping: async (auth) => {
        const { email, token } = auth as unknown as {
          email: string;
          token: string;
        };
        return {
          Authorization: `Basic ${Buffer.from(
            `${email}/token:${token}`,
          ).toString('base64')}`,
        };
      },
    }),
  ],
  triggers: [newTicketInView],
});
