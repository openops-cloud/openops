import {
  AssumeRoleCommand,
  AssumeRoleWithWebIdentityCommand,
  Credentials,
  STSClient,
} from '@aws-sdk/client-sts';
import { logger, SharedSystemProp, system } from '@openops/server-shared';
import { v4 as uuidv4 } from 'uuid';
import { getAwsClient } from './get-client';

let cachedCredentials: {
  credentials: Credentials;
  expiresAt: number;
} | null = null;

export function clearAzureFederationCache() {
  cachedCredentials = null;
}

export async function assumeTargetRoleViaAzureFederation(
  defaultRegion: string,
  roleArn: string,
  externalId?: string,
  endpoint?: string | undefined | null,
): Promise<Credentials | undefined> {
  const sourceCredentials = await getAwsCredentialsFromAzureIdentity(
    defaultRegion,
  );

  if (!sourceCredentials?.AccessKeyId || !sourceCredentials.SecretAccessKey) {
    throw new Error('Failed to get AWS credentials from Azure identity');
  }

  const client = getAwsClient(
    STSClient,
    {
      accessKeyId: sourceCredentials.AccessKeyId,
      secretAccessKey: sourceCredentials.SecretAccessKey,
      sessionToken: sourceCredentials.SessionToken,
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
}

export async function getAwsCredentialsFromAzureIdentity(
  defaultRegion: string,
): Promise<Credentials | undefined> {
  const now = Date.now();
  const buffer = 5 * 60 * 1000;

  if (cachedCredentials && cachedCredentials.expiresAt > now + buffer) {
    return cachedCredentials.credentials;
  }

  const webIdentityToken = await getAzureOidcTokenForAws();
  const client = new STSClient({
    region: defaultRegion,
  });

  const federationRoleArn = system.getOrThrow<string>(
    SharedSystemProp.AWS_AZURE_FEDERATION_ROLE_ARN,
  );

  const command = new AssumeRoleWithWebIdentityCommand({
    RoleArn: federationRoleArn,
    RoleSessionName: 'openops-' + uuidv4(),
    WebIdentityToken: webIdentityToken,
  });

  const response = await client.send(command);

  if (response.Credentials) {
    cachedCredentials = {
      credentials: response.Credentials,
      expiresAt: response.Credentials.Expiration
        ? new Date(response.Credentials.Expiration).getTime()
        : now + 3600 * 1000,
    };
  }

  return response.Credentials;
}

async function getAzureOidcTokenForAws(): Promise<string> {
  const resource = 'api://AzureADTokenExchange';

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
    logger.info('Failed to get Azure managed identity token.', response);
    throw new Error('Failed to get Azure managed identity token.');
  }

  const data = (await response.json()) as { access_token: string };

  return data.access_token;
}
