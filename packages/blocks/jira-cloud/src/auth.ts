import { HttpError, HttpMethod } from '@openops/blocks-common';
import { BlockAuth, Property, Validators } from '@openops/blocks-framework';
import { sendJiraRequest } from './lib/common';

export const jiraCloudAuth = BlockAuth.CustomAuth({
  authProviderKey: 'Jira',
  authProviderDisplayName: 'Jira Cloud',
  authProviderLogoUrl: `/blocks/jira.png`,
  description: `
You can generate your API token from:
***https://id.atlassian.com/manage-profile/security/api-tokens***
    `,
  required: true,
  props: {
    instanceUrl: Property.ShortText({
      displayName: 'Instance URL',
      description:
        'The link of your Jira instance (e.g https://example.atlassian.net)',
      required: true,
      validators: [Validators.url],
    }),
    email: Property.ShortText({
      displayName: 'Email',
      description: 'The email you use to login to Jira',
      required: true,
      validators: [Validators.email],
    }),
    apiToken: Property.SecretText({
      displayName: 'API Token',
      description: 'Your Jira API Token',
      required: true,
    }),
  },
  validate: async ({ auth }) => {
    try {
      await sendJiraRequest({
        auth: auth,
        method: HttpMethod.GET,
        url: 'myself',
      });
      return {
        valid: true,
      };
    } catch (e) {
      return {
        valid: false,
        error: ((e as HttpError).response.body as any).message,
      };
    }
  },
});

export type JiraAuth = {
  instanceUrl: string;
  email: string;
  apiToken: string;
};
