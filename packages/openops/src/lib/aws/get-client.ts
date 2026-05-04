import { logger, SharedSystemProp, system } from '@openops/server-shared';
import { AwsCredentials } from './auth';
import { assumeRoleFromAzureManagedIdentity } from './sts-common';

export function getAwsClient<T>(
  ClientConstructor: new (config: {
    region: string;
    credentials: AwsCredentials | undefined;
    endpoint?: string;
  }) => T,
  credentials: AwsCredentials,
  region: string,
): T {
  try {
    const config: any = { region };
    if (credentials.accessKeyId) {
      config.credentials = {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      };
    } else if (!system.getBoolean(SharedSystemProp.AWS_ENABLE_IMPLICIT_ROLE)) {
      throw new Error(
        'AWS credentials are required, please provide accessKeyId and secretAccessKey',
      );
    } else {
      // 👇 Lazy async provider (THIS is the trick)
      config.credentials = async () => {
        return assumeRoleFromAzureManagedIdentity(region);
      };
    }

    if (credentials.endpoint) {
      config.endpoint = credentials.endpoint;
    }

    return new ClientConstructor(config);
  } catch (error) {
    logger.error('Failed to create AWS client', error);
    throw error;
  }
}
