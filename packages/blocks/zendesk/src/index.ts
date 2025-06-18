import { createCustomApiCallAction } from '@openops/blocks-common';
import {
  blockAuth,
  Property,
  createblock,
} from '@openops/blocks-framework';
import { blockCategory } from '@openops/shared';
import { newTicketInView } from './lib/trigger/new-ticket-in-view';

const markdownProperty = `
**Organization**: The organization name can be found in the URL (e.g https://ORGANIZATION_NAME.zendesk.com).

**Agent Email**: The email you use to log in to Zendesk.

**API Token**: You can find this in the Zendesk Admin Panel under Settings > APIs > Zendesk API.
`;

export const zendeskAuth = blockAuth.CustomAuth({
  description: markdownProperty,
  props: {
    email: Property.ShortText({
      displayName: 'Agent Email',
      description: 'The email address you use to login to Zendesk',
      required: true,
    }),
    token: Property.ShortText({
      displayName: 'Token',
      description: 'The API token you can generate in Zendesk',
      required: true,
    }),
    subdomain: Property.ShortText({
      displayName: 'Organization (e.g openopshelp)',
      description: 'The subdomain of your Zendesk instance',
      required: true,
    }),
  },
  required: true,
});

export const zendesk = createblock({
  displayName: 'Zendesk',
  description: 'Customer service software and support ticket system',

  minimumSupportedRelease: '0.30.0',
  logoUrl: 'https://cdn.openops.com/blocks/zendesk.png',
  authors: ["kishanprmr","MoShizzle","khaledmashaly","abuaboud"],
  categories: [blockCategory.CUSTOMER_SUPPORT],
  auth: zendeskAuth,
  actions: [
    createCustomApiCallAction({
      baseUrl: (auth) =>
        `https://${
          (auth as { subdomain: string }).subdomain
        }.zendesk.com/api/v2`,
      auth: zendeskAuth,
      authMapping: async (auth) => ({
        Authorization: `Basic ${Buffer.from(
          `${(auth as { email: string }).email}/token:${
            (auth as { token: string }).token
          }`
        ).toString('base64')}`,
      }),
    }),
  ],
  triggers: [newTicketInView],
});
