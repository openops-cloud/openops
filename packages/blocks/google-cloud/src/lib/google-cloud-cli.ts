import { runCliCommand, useTempFile } from '@openops/common';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

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
    const gcpConfigDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'gcloud-config'),
    );
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

async function loginGCPWithKeyObject(keyObject: string, envVars: any) {
  const result = await useTempFile(keyObject, async (filePath) => {
    const loginCommand = `gcloud auth activate-service-account --key-file=${filePath}`;
    return await runCliCommand(loginCommand, 'gcloud', envVars);
  });

  return result;
}
