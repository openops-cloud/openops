import {
  AssumeRoleCommand,
  AssumeRoleWithWebIdentityCommand,
  Credentials,
  GetCallerIdentityCommand,
  STSClient,
} from '@aws-sdk/client-sts';
import { logger, SharedSystemProp, system } from '@openops/server-shared';
import { v4 as uuidv4 } from 'uuid';
import { getAwsClient } from './get-client';

export async function getAccountId(
  credentials: any,
  defaultRegion: string,
): Promise<string> {
  const client = getAwsClient(STSClient, credentials, defaultRegion);
  const command = new GetCallerIdentityCommand({});
  const response = await client.send(command);

  return response.Account ?? '';
}

export async function assumeRole(
  accessKeyId: string,
  secretAccessKey: string,
  defaultRegion: string,
  roleArn: string,
  externalId?: string,
  endpoint?: string | undefined | null,
): Promise<Credentials | undefined> {
  if (
    !accessKeyId &&
    system.getBoolean(SharedSystemProp.AWS_ENABLE_IMPLICIT_ROLE)
    // && Azure deployment)
  ) {
    try {
      const x = await assumeRoleFromAzureManagedIdentity(defaultRegion);

      const client = getAwsClient(
        STSClient,
        {
          accessKeyId: x!.AccessKeyId!,
          secretAccessKey: x!.SecretAccessKey!,
          sessionToken: x!.SessionToken,
          endpoint,
        },
        defaultRegion,
      );

      const command = new AssumeRoleCommand({
        RoleArn: roleArn,
        ExternalId: externalId || undefined,
        RoleSessionName: 'openops-' + uuidv4(),
      });

      const response = await client.send(command);

      return response.Credentials;
    } catch (error) {
      logger.error('Failed to assume role from Azure Managed Identity:', error);
      throw error;
    }
  }

  const client = getAwsClient(
    STSClient,
    { accessKeyId, secretAccessKey, endpoint },
    defaultRegion,
  );

  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    ExternalId: externalId || undefined,
    RoleSessionName: 'openops-' + uuidv4(),
  });

  const response = await client.send(command);

  return response.Credentials;
}

export async function assumeRoleFromAzureManagedIdentity(
  defaultRegion: string,
  // roleArn: string,
  // azureTokenAudience?: string,
  // endpoint?: string | undefined | null,
): Promise<Credentials | undefined> {
  // if (!azureTokenAudience) {
  //   throw new Error('Azure deployment is not supported yet');
  // }

  const webIdentityToken = await getAzureManagedIdentityToken();

  const client = new STSClient({
    region: defaultRegion,
  });

  const arn = system.get(SharedSystemProp.AWS_IMPLICIT_ROLE_ARN)!;

  const command = new AssumeRoleWithWebIdentityCommand({
    RoleArn: arn,
    RoleSessionName: 'openops-' + uuidv4(),
    WebIdentityToken: webIdentityToken,
  });

  const response = await client.send(command);

  logger.info('Assumed role from Azure Managed Identity');
  return response.Credentials;
}

async function getAzureManagedIdentityToken(): Promise<string> {
  const resource = system.get(SharedSystemProp.AWS_IMPLICIT_ROLE_AUD)!;

  const url =
    `http://169.254.169.254/metadata/identity/oauth2/token` +
    `?api-version=2018-02-01` +
    `&resource=${encodeURIComponent(resource)}`;

  const response = await fetch(url, {
    headers: {
      Metadata: 'true',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to get Azure managed identity token: ${
        response.status
      } ${await response.text()}`,
    );
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}
