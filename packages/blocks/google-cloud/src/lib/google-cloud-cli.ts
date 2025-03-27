import {
  getDefaultCloudSDKConfig,
  loginGCPWithKeyObject,
  runCliCommand,
} from '@openops/common';
export async function runCommand(
  command: string,
  auth: any,
  shouldUseHostCredentials: boolean,
  project?: string,
): Promise<string> {
  const envVars: Record<string, string> = {
    PATH: process.env['PATH'] || '',
    CLOUDSDK_CORE_DISABLE_PROMPTS: '1',
  };

  const processGoogleCloudConfigDir = process.env['CLOUDSDK_CONFIG'];
  if (processGoogleCloudConfigDir) {
    envVars['CLOUDSDK_CONFIG'] = processGoogleCloudConfigDir;
  }

  if (!shouldUseHostCredentials) {
    const gcpConfigDir = await getDefaultCloudSDKConfig();
    envVars['CLOUDSDK_CONFIG'] = gcpConfigDir;
    await loginGCPWithKeyObject(auth.keyFileContent, envVars);
  }

  if (project) {
    await runCliCommand(
      `gcloud config set project ${project}`,
      'gcloud',
      envVars,
    );
  }

  return await runCliCommand(command, 'gcloud', envVars);
}
