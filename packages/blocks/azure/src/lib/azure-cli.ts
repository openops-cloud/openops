import { runCliCommand } from '@openops/common';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

function setEnvIfExists(envVars: Record<string, string>, key: string): void {
  const value = process.env[key];
  if (value) {
    envVars[key] = value;
  }
}

export async function runCommand(
  command: string,
  credentials: any,
  shouldUseHostCredentials: boolean,
  subscription?: string,
): Promise<string> {
  const envVars: Record<string, string> = {
    PATH: process.env['PATH'] || '',
  };

  setEnvIfExists(envVars, 'AZURE_CONFIG_DIR');
  setEnvIfExists(envVars, 'AZURE_EXTENSION_DIR');

  if (!shouldUseHostCredentials) {
    const azureConfigDir = mkdtempSync(join(tmpdir(), 'azure-cli'));
    envVars['AZURE_CONFIG_DIR'] = azureConfigDir;

    await login(credentials, envVars);
  }

  if (subscription) {
    await runCliCommand(
      `account set --subscription ${subscription}`,
      'az',
      envVars,
    );
  }

  return await runCliCommand(command, 'az', envVars);
}

async function login(credentials: any, envVars: any) {
  try {
    const loginCommand = `login --service-principal --username ${credentials.clientId} --password ${credentials.clientSecret} --tenant ${credentials.tenantId}`;

    return await runCliCommand(loginCommand, 'az', envVars);
  } catch (error) {
    let message = 'Error while login into azure: ';
    if (String(error).includes('login --service-principal')) {
      message += 'login --service-principal ***REDACTED***';
    } else {
      message += error;
    }

    throw new Error(message);
  }
}
