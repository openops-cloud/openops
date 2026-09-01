import { runCliCommand } from '@openops/common';
import { SharedSystemProp, system } from '@openops/server-shared';

/**
 * Variables the AWS CLI uses to find credentials it has not been handed
 * explicitly. The CLI runs with a replaced environment (see executeFile), so
 * under implicit role these have to be forwarded deliberately.
 *
 * On EC2 nothing needs forwarding: the CLI reaches the instance role over IMDS
 * at a fixed link-local address. Every other role-based deployment is
 * discoverable only through the environment -- ECS and Fargate task roles
 * through the container credentials variables, EKS IRSA through the web
 * identity ones -- so without this, implicit role fails there with
 * "Unable to locate credentials".
 */
const AMBIENT_CREDENTIAL_ENV_VARS = [
  'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI',
  'AWS_CONTAINER_CREDENTIALS_FULL_URI',
  'AWS_CONTAINER_AUTHORIZATION_TOKEN',
  'AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE',
  'AWS_ROLE_ARN',
  'AWS_ROLE_SESSION_NAME',
  'AWS_WEB_IDENTITY_TOKEN_FILE',
];

function getAmbientCredentialEnvVars(): Record<string, string> {
  const envVars: Record<string, string> = {};

  for (const name of AMBIENT_CREDENTIAL_ENV_VARS) {
    const value = process.env[name];
    if (value) {
      envVars[name] = value;
    }
  }

  return envVars;
}

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
    Object.assign(envVars, getAmbientCredentialEnvVars());
  }

  return await runCliCommand(command, 'aws', envVars);
}
