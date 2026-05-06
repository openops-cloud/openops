import { SharedSystemProp, system } from '@openops/server-shared';
import { AwsCredentials } from './auth';
import { getAwsCredentialsFromAzureIdentity } from './azure-aws-federation';

type AwsClientConfig = {
  region: string;
  credentials?: AwsCredentials | (() => Promise<AwsCredentials>);
  endpoint?: string;
};

type CachedAwsCredentials = AwsCredentials & {
  expiration?: Date;
};

const azureCredentialCache = new Map<
  string,
  {
    credentials: CachedAwsCredentials | null;
    promise: Promise<CachedAwsCredentials> | null;
  }
>();

export function getAwsClient<T>(
  ClientConstructor: new (config: AwsClientConfig) => T,
  credentials: AwsCredentials,
  region: string,
): T {
  const config: AwsClientConfig = {
    region,
  };

  if (credentials.accessKeyId) {
    config.credentials = createStaticCredentials(credentials);
  } else if (!system.getBoolean(SharedSystemProp.AWS_ENABLE_IMPLICIT_ROLE)) {
    throw new Error(
      'AWS credentials are required, please provide accessKeyId and secretAccessKey',
    );
  } else if (
    system.getBoolean(SharedSystemProp.AWS_USE_AZURE_MANAGED_IDENTITY)
  ) {
    config.credentials = createAzureManagedIdentityCredentialsProvider(region);
  }

  if (credentials.endpoint) {
    config.endpoint = credentials.endpoint;
  }

  return new ClientConstructor(config);
}

function createStaticCredentials(credentials: AwsCredentials): AwsCredentials {
  return {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  };
}

function createAzureManagedIdentityCredentialsProvider(
  region: string,
): () => Promise<CachedAwsCredentials> {
  const cache = getOrCreateAzureCredentialCache(region);

  return async () => {
    if (hasValidCredentials(cache.credentials)) {
      return cache.credentials;
    }

    if (cache.promise) {
      return cache.promise;
    }

    cache.promise = fetchAzureManagedIdentityCredentials(region);

    try {
      cache.credentials = await cache.promise;
      return cache.credentials;
    } finally {
      cache.promise = null;
    }
  };
}

function getOrCreateAzureCredentialCache(region: string) {
  let cache = azureCredentialCache.get(region);

  if (!cache) {
    cache = {
      credentials: null,
      promise: null,
    };

    azureCredentialCache.set(region, cache);
  }

  return cache;
}

function hasValidCredentials(
  credentials: CachedAwsCredentials | null,
): credentials is CachedAwsCredentials {
  if (!credentials) {
    return false;
  }

  if (!credentials.expiration) {
    return true;
  }

  // Refresh 1 minute before expiration
  return credentials.expiration.getTime() > Date.now() + 60_000;
}

async function fetchAzureManagedIdentityCredentials(
  region: string,
): Promise<CachedAwsCredentials> {
  const stsCredentials = await getAwsCredentialsFromAzureIdentity(region);

  if (!stsCredentials?.AccessKeyId || !stsCredentials?.SecretAccessKey) {
    throw new Error(
      'Failed to obtain AWS credentials from Azure managed identity',
    );
  }

  return {
    accessKeyId: stsCredentials.AccessKeyId,
    secretAccessKey: stsCredentials.SecretAccessKey,
    sessionToken: stsCredentials.SessionToken,
    expiration: stsCredentials.Expiration,
  };
}
