import { runCliCommand } from '@openops/common';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export async function runCommand(
  command: string,
  auth: any,
  project?: string,
): Promise<string> {
  const envVars: Record<string, string> = {
    PATH: process.env['PATH'] || '',
  };

  loginGCPWithKeyObject(auth.keyFileContent, envVars);
  if (project) {
    await runCliCommand(`gcloud config set project ${project}`, 'az', envVars);
  }

  return await runCliCommand(command, 'az', envVars);
}

async function loginGCPWithKeyObject(keyObject: string, envVars: any) {
  const tmpKeyPath = path.join(os.tmpdir(), 'gcp-key.json');
  await fs.writeFile(tmpKeyPath, keyObject);

  const loginCommand = `auth activate-service-account --key-file=${tmpKeyPath}`;
  return await runCliCommand(loginCommand, 'gcloud', envVars);
}
