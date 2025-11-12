import { authenticateUserWithAzure } from '@openops/common';
import { runCommand } from '../azure-cli';

function parseAzAccessToken(raw?: string | null): string {
  const parsed = JSON.parse(raw ?? '{}');
  const token = parsed?.accessToken;
  if (!token) {
    throw new Error('Failed to obtain Azure access token');
  }
  return token;
}

export const getHostAccessToken = async (
  auth: unknown,
  subscription?: string,
): Promise<string> => {
  const output = await runCommand(
    'account get-access-token --resource https://management.azure.com --output json',
    auth,
    true,
    subscription,
  );
  return parseAzAccessToken(output);
};

export const getAzureAccessToken = async (
  auth: unknown,
  useHost: boolean,
  subscription?: string,
): Promise<string> => {
  if (useHost) {
    return getHostAccessToken(auth, subscription);
  }
  const { access_token } = await authenticateUserWithAzure(auth);
  return access_token;
};
