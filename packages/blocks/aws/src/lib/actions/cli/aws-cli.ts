import { runCliCommand } from '@openops/common';
import { SharedSystemProp, system } from '@openops/server-shared';

export async function runCommand(
  command: string,
  region: string,
  credentials: any,
): Promise<string> {
  const envVars: any = {
    AWS_DEFAULT_REGION: region,
    PATH: process.env['PATH'] ?? '',
  };

  if (credentials.accessKeyId && credentials.secretAccessKey) {
    envVars.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
    envVars.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
    if (credentials.sessionToken) {
      envVars.AWS_SESSION_TOKEN = credentials.sessionToken;
    }
  } else if (!system.getBoolean(SharedSystemProp.AWS_ENABLE_IMPLICIT_ROLE)) {
    throw new Error(
      'AWS credentials are required, please provide accessKeyId and secretAccessKey',
    );
  }

  return await runCliCommand(command, 'aws', envVars);
}
