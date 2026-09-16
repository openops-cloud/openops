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

  if (
    typeof credentials.accessKeyId === 'string' &&
    credentials.accessKeyId.trim() &&
    typeof credentials.secretAccessKey === 'string' &&
    credentials.secretAccessKey.trim()
  ) {
    envVars.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
    envVars.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
    if (credentials.sessionToken) {
      envVars.AWS_SESSION_TOKEN = credentials.sessionToken;
    }
  } else if (!system.getBoolean(SharedSystemProp.AWS_ENABLE_IMPLICIT_ROLE)) {
    throw new Error(
      'AWS credentials are required, please provide accessKeyId and secretAccessKey',
    );
  } else {
    // runCliCommand replaces the environment rather than extending it, so
    // anything the CLI needs in order to authenticate has to be named here. It
    // understands the standard web identity variables and performs the exchange
    // itself, so pass them through: from our own settings on AKS, or from what
    // IRSA injected on EKS.
    //
    // The Azure managed identity path has no equivalent -- the CLI cannot
    // consume an IMDS token -- so this action still needs static keys there.
    const webIdentityTokenFile =
      system.get(SharedSystemProp.AWS_WEB_IDENTITY_TOKEN_FILE) ??
      process.env['AWS_WEB_IDENTITY_TOKEN_FILE'];
    const roleArn =
      system.get(SharedSystemProp.AWS_FEDERATION_ROLE_ARN) ??
      process.env['AWS_ROLE_ARN'];

    if (webIdentityTokenFile && roleArn) {
      envVars.AWS_WEB_IDENTITY_TOKEN_FILE = webIdentityTokenFile;
      envVars.AWS_ROLE_ARN = roleArn;
    }
  }

  return await runCliCommand(command, 'aws', envVars);
}
