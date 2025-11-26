import { FronteggApp, initialize } from '@frontegg/js';

export const additionalFronteggParams = {
  // Google OAuth 2.0: Prompt the user to select an account. https://developers.google.com/identity/protocols/oauth2/web-server#creatingclient
  prompt: 'select_account',
};

let fronteggApp: FronteggApp | null = null;

type Options = {
  url: string;
  clientId?: string;
  tenant?: string;
};

export function initializeFrontegg({
  url,
  clientId,
  tenant,
}: Options): FronteggApp {
  if (fronteggApp) {
    return fronteggApp;
  }
  const tenantResolver = tenant ? () => ({ tenant }) : undefined;
  const options = {
    contextOptions: {
      baseUrl: url,
      clientId,
      tenantResolver,
    },
    authOptions: {
      keepSessionAlive: true,
    },
    hostedLoginBox: true,
  };
  fronteggApp = initialize(options);
  return fronteggApp;
}

export function getFronteggApp(): FronteggApp | null {
  return fronteggApp;
}
