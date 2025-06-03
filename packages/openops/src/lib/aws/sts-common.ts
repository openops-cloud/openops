import {
  AssumeRoleCommand,
  Credentials,
  GetCallerIdentityCommand,
  STSClient,
} from '@aws-sdk/client-sts';
import { v4 as uuidv4 } from 'uuid';
import { getAwsClient } from './get-client';

export async function getAccountId(
  credentials: any,
  defaultRegion: string,
): Promise<string> {
  const client = getAwsClient(
    STSClient,
    credentials,
    defaultRegion,
  ) as STSClient;
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
): Promise<Credentials | undefined> {
  const client = getAwsClient(
    STSClient,
    { accessKeyId, secretAccessKey },
    defaultRegion,
  ) as STSClient;
  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    ExternalId: externalId || undefined,
    RoleSessionName: 'openops-' + uuidv4(),
  });
  const response = await client.send(command);

  return response.Credentials;
}
