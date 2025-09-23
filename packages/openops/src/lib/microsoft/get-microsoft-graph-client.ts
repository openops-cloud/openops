import { Client } from '@microsoft/microsoft-graph-client';

export const getMicrosoftGraphClient = (accessToken: string) =>
  Client.initWithMiddleware({
    authProvider: {
      getAccessToken: () => Promise.resolve(accessToken),
    },
  });
