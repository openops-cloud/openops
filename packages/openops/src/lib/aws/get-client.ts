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
  return new ClientConstructor({
    region,
    credentials: credentials.accessKeyId
      ? {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        }
      : undefined,
    endpoint: credentials.endpoint ? credentials.endpoint : undefined,
  });
}
