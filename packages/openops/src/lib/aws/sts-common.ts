import {
  AssumeRoleCommand,
  Credentials,
  GetCallerIdentityCommand,
  STSClient,
} from '@aws-sdk/client-sts';
import { SharedSystemProp, system } from '@openops/server-shared';
import { v4 as uuidv4 } from 'uuid';
import { assumeTargetRoleViaAzureFederation } from './azure-aws-federation';
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
    system.getBoolean(SharedSystemProp.AWS_ENABLE_IMPLICIT_ROLE) &&
    system.getBoolean(SharedSystemProp.AWS_USE_AZURE_MANAGED_IDENTITY)
  ) {
    return assumeTargetRoleViaAzureFederation(
      defaultRegion,
      roleArn,
      externalId,
      endpoint,
    );
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
