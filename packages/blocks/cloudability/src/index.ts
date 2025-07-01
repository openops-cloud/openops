import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { cloudabilityAuth } from './lib/auth';

const markdown = `When making calls to the regions, the API subdomain changes:

- **US:**  
  \`\`\`
  https://api.cloudability.com/v3/business-mappings
  \`\`\`
- **EMEA:**  
  \`\`\`
  https://api-eu.cloudability.com/v3/business-mappings
  \`\`\`
- **Middle East:**  
  \`\`\`
  https://api-me.cloudability.com/v3/business-mappings
  \`\`\`
- **APAC:**  
  \`\`\`
  https://api-au.cloudability.com/v3/business-mappings
  \`\`\`


For more information, visit the [Cloudability API documentation](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-getting-started-cloudability-v3).
`;

export const cloudability = createBlock({
  displayName: 'Cloudability',
  auth: cloudabilityAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/cloudability.png',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    createCustomApiCallAction({
      baseUrl: () => 'https://api.cloudability.com',
      auth: cloudabilityAuth,
      authMapping: async (context) => {
        const apiKey = context.auth as string;
        const encoded = Buffer.from(`${apiKey}:`).toString('base64');
        return {
          Authorization: `Basic ${encoded}`,
        };
      },
      additionalProps: {
        documentation: Property.MarkDown({
          value: markdown,
        }),
      },
    }),
  ],
  triggers: [],
});
