import { BlockAuth } from '@openops/blocks-framework';

export const auth = BlockAuth.OAuth2({
  authProviderKey: 'Github',
  authProviderDisplayName: 'Github',
  authProviderLogoUrl: `https://static.openops.com/blocks/github.png`,
  required: true,
  authUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  // Repo is currently required in scope: https://github.com/orgs/discussions/7891
  scope: ['repo', 'actions:write', 'contents:read', 'codespace', 'read:org'],
});
