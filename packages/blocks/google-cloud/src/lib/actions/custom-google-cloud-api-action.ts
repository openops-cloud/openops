import { createCustomApiCallAction } from '@openops/blocks-common';
import { Property } from '@openops/blocks-framework';
import { getUseHostSessionProperty, googleCloudAuth } from '@openops/common';
import { projectCliDropdown } from '../common-properties';
import { runCommands } from '../google-cloud-cli';

async function getAccessToken(
  auth: unknown,
  useHostSession: boolean,
  project?: string,
): Promise<string> {
  const outputs = await runCommands(
    ['auth print-access-token'],
    auth,
    useHostSession,
    project,
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
  description: 'Make a custom REST API call to Google Cloud.',
  displayName: 'Custom Google Cloud API Call',
  baseUrl: () => 'https://www.googleapis.com',
  additionalProps: {
    documentation: Property.MarkDown({
      value:
        'For more information, visit the [Google Cloud API documentation](https://cloud.google.com/apis/docs/reference/rest).',
    }),
    useHostSession: getUseHostSessionProperty(
      'Google Cloud',
      'gcloud auth login',
    ),
    project: projectCliDropdown,
  },
  authMapping: async (context: any) => {
    const useHostSession = context.propsValue.useHostSession?.[
      'useHostSessionCheckbox'
    ] as boolean;
    const project = context.propsValue.project as string | undefined;
    const token = await getAccessToken(
      context.auth,
      useHostSession === true,
      project,
    );
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  },
});
