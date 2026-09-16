import {
  AssumeRoleWithWebIdentityCommand,
  Credentials,
  STSClient,
} from '@aws-sdk/client-sts';
import { SharedSystemProp, system } from '@openops/server-shared';
import { readFile } from 'node:fs/promises';
import { v4 as uuidv4 } from 'uuid';

let cachedCredentials: {
  credentials: Credentials;
  expiresAt: number;
} | null = null;

export function clearWebIdentityFederationCache(): void {
  cachedCredentials = null;
}

/**
 * Exchanges a Kubernetes projected service account token for AWS credentials.
 *
 * Used on AKS. EKS never reaches here: IRSA sets the standard web identity
 * variables and the AWS SDK's own credential chain does the same exchange.
 */
export async function getAwsCredentialsFromWebIdentityToken(
  defaultRegion: string,
): Promise<Credentials | undefined> {
  const now = Date.now();
  const buffer = 5 * 60 * 1000;

  if (cachedCredentials && cachedCredentials.expiresAt > now + buffer) {
    return cachedCredentials.credentials;
  }

  const tokenFile = system.getOrThrow<string>(
    SharedSystemProp.AWS_WEB_IDENTITY_TOKEN_FILE,
  );
  const roleArn = system.getOrThrow<string>(
    SharedSystemProp.AWS_FEDERATION_ROLE_ARN,
  );

  // Re-read on every refresh: the kubelet rotates this file.
  const webIdentityToken = (await readFile(tokenFile, 'utf8')).trim();

  const client = new STSClient({ region: defaultRegion });

  const command = new AssumeRoleWithWebIdentityCommand({
    RoleArn: roleArn,
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
