import { runCliCommand } from '@openops/common';
import { SharedSystemProp, system } from '@openops/server-shared';

export async function runCommand(
  command: string,
  region: string,
  credentials: any,
): Promise<string> {
  if (
    !credentials.accessKeyId &&
    !system.getBoolean(SharedSystemProp.AWS_ENABLE_IMPLICIT_ROLE)
  ) {
    throw new Error(
      'AWS credentials are required, please provide accessKeyId and secretAccessKey',
    );
  }
  const envVars = {
    AWS_ACCESS_KEY_ID: credentials.accessKeyId,
    AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
    AWS_SESSION_TOKEN: credentials.sessionToken,
    AWS_DEFAULT_REGION: region,
    PATH: process.env['PATH'] ?? '',
  };

  return await runCliCommand(command, 'aws', envVars);
}
