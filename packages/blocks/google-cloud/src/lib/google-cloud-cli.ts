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
  const result = await runCommands(
    [command],
    auth,
    shouldUseHostCredentials,
    project,
  );

  if (result.length !== 1) {
    throw new Error(`Expected exactly one result, but got ${result.length}.`);
  }

  return result[0];
}

export async function runCommands(
  commands: string[],
  auth: any,
  shouldUseHostCredentials: boolean,
  project?: string,
): Promise<string[]> {
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

  const results: string[] = [];
  for (const command of commands) {
    const output = await runCliCommand(command, 'gcloud', envVars);
    results.push(output);
  }

  return results;
}
