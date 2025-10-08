import { createCustomApiCallAction } from '@openops/blocks-common';
import { Property } from '@openops/blocks-framework';
import { getUseHostSessionProperty, googleCloudAuth } from '@openops/common';
import { getProjectsStaticDropdown } from '../common-properties';
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
  baseUrl: () => 'https://cloudresourcemanager.googleapis.com/v1',
  additionalProps: {
    documentation: Property.MarkDown({
      value:
        'For more information, visit the [Google Cloud API documentation](https://cloud.google.com/apis/docs/reference/rest).',
    }),
    useHostSession: getUseHostSessionProperty(
      'Google Cloud',
      'gcloud auth login',
    ),
    project: Property.DynamicProperties({
      displayName: '',
      required: false,
      refreshers: [
        'auth',
        'useHostSession',
        'useHostSession.useHostSessionCheckbox',
      ],
      props: async ({
        auth,
        useHostSession,
      }): Promise<{ [key: string]: any }> => {
        if (useHostSession?.['useHostSessionCheckbox'] as boolean) {
          try {
            return {
              projectDropdown: await getProjectsStaticDropdown(auth, true),
            } as any;
          } catch (error) {
            return {
              projectDropdown: Property.StaticDropdown({
                displayName: 'Default Project',
                description: 'Select a default project to run the command in',
                required: true,
                options: {
                  disabled: true,
                  options: [],
                  placeholder: 'Please run gcloud auth login locally',
                  error: `${error}`,
                },
              }),
            } as any;
          }
        }
        return {};
      },
    }),
  },
  authMapping: async (context: Record<string, any>) => {
    const shouldUseHostCredentials =
      context['propsValue'].useHostSession?.['useHostSessionCheckbox'];
    const project = context['propsValue']?.project?.['projectDropdown'];
    const token = await getAccessToken(
      context['auth'],
      shouldUseHostCredentials === true,
      project,
    );
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  },
});
