import { createCustomApiCallAction } from '@openops/blocks-common';
import { googleCloudAuth } from '@openops/common';
import { runCommands } from '../google-cloud-cli';

async function getAccessToken(auth: any): Promise<string> {
  const outputs = await runCommands(
    ['auth print-access-token'],
    auth,
    false,
    undefined,
    'gcloud',
  );
  const token = outputs[0]?.trim();
  if (!token) {
    throw new Error('Failed to obtain Google Cloud access token');
  }
  return token;
}

export const customGoogleCloudApiCallAction = createCustomApiCallAction({
  auth: googleCloudAuth,
  name: 'google_custom_api_call',
  description: 'Make a custom REST API call to Google Cloud',
  displayName: 'Custom Google Cloud API Call',
  baseUrl: () => 'https://www.googleapis.com',
  authMapping: async (context: any) => {
    const token = await getAccessToken(context.auth);
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  },
});
