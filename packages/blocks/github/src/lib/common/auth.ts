import { BlockAuth } from '@openops/blocks-framework';
import { Provider, getConnectionProvider } from '@openops/shared';

export const auth = BlockAuth.OAuth2({
  provider: getConnectionProvider(Provider.GITHUB),
  required: true,
  authUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  // Repo is currently required in scope: https://github.com/orgs/discussions/7891
  scope: ['repo', 'actions:write', 'contents:read'],
});
