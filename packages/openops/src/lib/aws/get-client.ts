import { SharedSystemProp, system } from '@openops/server-shared';
import { AwsCredentials } from './auth';

export function getAwsClient<T>(
  ClientConstructor: new (config: {
    region: string;
    credentials: AwsCredentials | undefined;
    endpoint?: string;
  }) => T,
  credentials: AwsCredentials,
  region: string,
): T {
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
  }

  if (credentials.endpoint) {
    config.endpoint = credentials.endpoint;
  }

  return new ClientConstructor(config);
}
