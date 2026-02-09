import { BlockAuth, Property } from '@openops/blocks-framework';
import { SharedSystemProp, system } from '@openops/server-shared';
import { AxiosHeaders } from 'axios';
import { makeHttpRequest } from '../axios-wrapper';

export type AzureCredentials = {
  access_token: string;
  expires_in: number;
  ext_expires_in: number;
  token_type: string;
};

export function validateAzureCredentials(credentials: any): void {
  if (
    !credentials?.clientId ||
    !credentials?.clientSecret ||
    !credentials?.tenantId
  ) {
    throw new Error(
      'Azure credentials are required. Please provide clientId, clientSecret, and tenantId.',
    );
  }
}

export async function authenticateUserWithAzure(
  credentials: any,
): Promise<AzureCredentials> {
  validateAzureCredentials(credentials);

  const response = await makeHttpRequest<AzureCredentials>(
    'POST',
    `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`,
    new AxiosHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    }),
    `client_id=${credentials.clientId}&client_secret=${credentials.clientSecret}&grant_type=client_credentials&scope=https://management.azure.com/.default`,
  );

  return response;
}

const enableHostSession =
  system.getBoolean(SharedSystemProp.ENABLE_HOST_SESSION) ?? false;

export const azureAuth = BlockAuth.CustomAuth({
  authProviderKey: 'Azure',
  authProviderDisplayName: 'Azure',
  authProviderLogoUrl: `/blocks/azure.svg`,
  props: {
    clientId: Property.ShortText({
      displayName: 'Application (client) ID',
      required: true,
      description: 'The Azure Application (client) ID.',
    }),
    clientSecret: Property.SecretText({
      displayName: 'Client Secret',
      required: true,
      description: 'The secret associated with the Azure Application.',
    }),
    tenantId: Property.ShortText({
      displayName: 'Directory (tenant) ID',
      required: true,
      description: 'The Azure Directory (tenant) ID.',
    }),
  },
  required: !enableHostSession,
  validate: async ({ auth }) => {
    try {
      await authenticateUserWithAzure(auth);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: String(error),
      };
    }
  },
});
