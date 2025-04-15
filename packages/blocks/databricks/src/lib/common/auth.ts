import { BlockAuth, Property } from '@openops/blocks-framework';
import { getDatabricksToken } from './get-databricks-token';

const description = `
1. Go to the Databricks Account Console:
\`\`\`url
https://accounts.cloud.databricks.com/
\`\`\`
2. In the top-right corner, click the dropdown next to your username and copy your **Account ID**.
3. Navigate to **User Management > Service Principals**.
4. Create or select an existing service principal.
5. From the service principal details, copy the **Client ID**.
6. Create a new **Client Secret** if needed and copy it securely.

> These credentials will be used to generate a secure OAuth token to access Databricks REST APIs.
`;

const failedValidationResponse = {
  valid: false,
  error: 'Error validating API access.',
};

export const databricksAuth = BlockAuth.CustomAuth({
  required: true,
  description,
  props: {
    accountId: Property.ShortText({
      displayName: 'Account ID',
      required: true,
    }),
    clientId: Property.ShortText({
      displayName: 'Client ID',
      required: true,
    }),
    clientSecret: BlockAuth.SecretText({
      displayName: 'Client Secret',
      required: true,
    }),
  },
  validate: async ({ auth }) => {
    try {
      const token = await getDatabricksToken(auth);
      return token ? { valid: true } : failedValidationResponse;
    } catch {
      return failedValidationResponse;
    }
  },
});
