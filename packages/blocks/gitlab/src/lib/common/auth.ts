import { BlockAuth } from '@openops/blocks-framework';

const markdown = `
To get your GitLab Personal Access Token:

1. Log into your GitLab account
2. Go to your Profile Settings > Access Tokens
3. Create a new token with the required scopes:
   - api (for full API access)
   - read_user (to read user profile)
   - read_repository (to read repository content)
   - write_repository (to write repository content)
4. Copy the generated token

For more information, visit the [GitLab API documentation](https://docs.gitlab.com/ee/api/).
`;

export const auth = BlockAuth.SecretAuth({
  displayName: 'Personal Access Token',
  required: true,
  authProviderKey: 'Gitlab',
  authProviderDisplayName: 'Gitlab',
  authProviderLogoUrl: 'https://static.openops.com/blocks/gitlab.png',
  description: markdown,
});