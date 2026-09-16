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
 * The cluster's OIDC issuer signs the token and AWS verifies it against an IAM
 * identity provider, so no secret is stored on the host. Used on AKS, where the
 * token is projected by the chart. On EKS the AWS SDK's own default credential
 * chain does the same exchange from the variables IRSA injects, so this is not
 * involved there.
 *
 * AssumeRoleWithWebIdentity is an unsigned call, which is what lets it run with
 * no AWS credentials to start from.
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

  // Read on every refresh rather than held in memory: the kubelet rewrites this
  // file well before the token inside it expires.
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
