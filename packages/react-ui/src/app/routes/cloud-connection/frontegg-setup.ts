import { FronteggApp, initialize } from '@frontegg/js';

export const additionalFronteggParams = {
  // Google OAuth 2.0: Prompt the user to select an account. https://developers.google.com/identity/protocols/oauth2/web-server#creatingclient
  prompt: 'select_account',
};

export function initializeFrontegg(url: string, tenant?: string): FronteggApp {
  const tenantResolver = tenant ? () => ({ tenant: tenant }) : undefined;

  return initialize({
    contextOptions: {
      baseUrl: url,
      tenantResolver,
    },
    authOptions: {
      keepSessionAlive: true,
    },
    hostedLoginBox: true,
  });
}
