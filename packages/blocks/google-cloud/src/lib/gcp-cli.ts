import { runCliCommand } from '@openops/common';
import { logger } from '@openops/server-shared';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
export async function runCommand(
  command: string,
  auth: any,
  project?: string,
): Promise<string> {
  logger.info('LEYLA');
  const envVars: Record<string, string> = {
    PATH: process.env['PATH'] || '',
  };

  //loginGCPWithKeyObject(auth.keyFileContent, envVars);
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
  logger.info('LEYLA1');
  const tmpKeyPath = path.join(os.tmpdir(), 'gcp-key.json');
  await fs.writeFile(tmpKeyPath, keyObject);
  logger.info('LEYLA2 Logging in to GCP with key file');

  const loginCommand = `auth activate-service-account --key-file=${tmpKeyPath}`;
  const result = await runCliCommand(loginCommand, 'gcloud', envVars);
  logger.info('LEYLA3' + JSON.stringify(result));
  return result;
}
