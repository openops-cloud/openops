import {
  getDefaultCloudSDKConfig,
  loginGCPWithKeyObject,
  runCliCommand,
} from '@openops/common';
import { logger } from '@openops/server-shared';

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

  return result[0];
}

export async function runCommands(
  commands: string[],
  auth: any,
  shouldUseHostCredentials: boolean,
  project?: string,
): Promise<string[]> {
  logger.info('LEYLA2');
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
    logger.info('LEYLA2 running command ' + command);
    const output = await runCliCommand(command, 'gcloud', envVars);
    logger.info('result: ' + JSON.stringify(output));
    results.push(output);
  }

  return results;
}
