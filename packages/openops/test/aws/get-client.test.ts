const mockSystem = {
  getBoolean: jest.fn().mockReturnValue(false),
  get: jest.fn().mockReturnValue(undefined),
};
jest.mock('@openops/server-shared', () => ({
  system: mockSystem,
  SharedSystemProp: {
    AWS_ENABLE_IMPLICIT_ROLE: 'AWS_ENABLE_IMPLICIT_ROLE',
    AWS_USE_AZURE_MANAGED_IDENTITY: 'AWS_USE_AZURE_MANAGED_IDENTITY',
    AWS_WEB_IDENTITY_TOKEN_FILE: 'AWS_WEB_IDENTITY_TOKEN_FILE',
  },
}));

jest.mock('../../src/lib/aws/azure-aws-federation', () => ({
  getAwsCredentialsFromAzureIdentity: jest.fn(),
}));

jest.mock('../../src/lib/aws/web-identity-federation', () => ({
  getAwsCredentialsFromWebIdentityToken: jest.fn(),
}));

import { getAwsCredentialsFromAzureIdentity } from '../../src/lib/aws/azure-aws-federation';
import { getAwsClient } from '../../src/lib/aws/get-client';
import { getAwsCredentialsFromWebIdentityToken } from '../../src/lib/aws/web-identity-federation';

class MockServiceClient {
  constructor(public config: any) {}
}

describe('getClient', () => {
  const region = 'us-west-2';

  test('should correctly instantiate EC2Client with the correct configurations', () => {
    const credentials = {
      accessKeyId: 'some accessKeyId',
      secretAccessKey: 'some secretAccessKey',
      sessionToken: 'some sessionToken',
      endpoint: 'some endpoint',
    };

    const client = getAwsClient(MockServiceClient, credentials, region);

    expect(client).toBeInstanceOf(MockServiceClient);
    expect(client.config).toEqual({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
      endpoint: credentials.endpoint,
    });
  });

  test.each([undefined, null, ''])(
    'should correctly instantiate EC2Client with the correct configurations when endpoint is not provided',
    (endpointInput) => {
      const credentials = {
        accessKeyId: 'some accessKeyId',
        secretAccessKey: 'some secretAccessKey',
        sessionToken: 'some sessionToken',
        endpoint: endpointInput,
      };

      const client = getAwsClient(MockServiceClient, credentials, region);

      expect(client).toBeInstanceOf(MockServiceClient);
      expect(client.config).toEqual({
        region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
        endpoint: undefined,
      });
    },
  );

  test('should throw an error if credentials are not provided', () => {
    const credentials = {
      accessKeyId: '',
      secretAccessKey: '',
    };
    expect(() => {
      getAwsClient(MockServiceClient, credentials, region);
    }).toThrow(
      'AWS credentials are required, please provide accessKeyId and secretAccessKey',
    );
  });

  test('should not throw an error if credentials are not required', () => {
    mockSystem.getBoolean.mockReturnValueOnce(true);
    mockSystem.getBoolean.mockReturnValueOnce(false);

    const credentials = {
      accessKeyId: '',
      secretAccessKey: '',
    };
    try {
      const client = getAwsClient(MockServiceClient, credentials, region);
      expect(client).toBeInstanceOf(MockServiceClient);
      expect(client.config).toEqual({
        region,
        endpoint: undefined,
      });
    } finally {
      mockSystem.getBoolean.mockReturnValue(false);
    }
  });

  test('should use Azure managed identity when configured', async () => {
    mockSystem.getBoolean.mockImplementation((prop) => {
      if (prop === 'AWS_ENABLE_IMPLICIT_ROLE') {
        return true;
      }
      if (prop === 'AWS_USE_AZURE_MANAGED_IDENTITY') {
        return true;
      }
      return false;
    });

    const mockCreds = {
      AccessKeyId: 'azure-key',
      SecretAccessKey: 'azure-secret',
    };
    (getAwsCredentialsFromAzureIdentity as jest.Mock).mockResolvedValue(
      mockCreds,
    );

    const credentials = {
      accessKeyId: '',
      secretAccessKey: '',
    };

    try {
      const client = getAwsClient(MockServiceClient, credentials, region);
      expect(client).toBeInstanceOf(MockServiceClient);
      expect(typeof client.config.credentials).toBe('function');

      const result = await client.config.credentials();
      expect(result).toEqual({
        accessKeyId: 'azure-key',
        secretAccessKey: 'azure-secret',
      });
      expect(getAwsCredentialsFromAzureIdentity).toHaveBeenCalledWith(region);
    } finally {
      mockSystem.getBoolean.mockReturnValue(false);
    }
  });
  test('should use the web identity token file when configured', async () => {
    mockSystem.getBoolean.mockImplementation((prop) => {
      return prop === 'AWS_ENABLE_IMPLICIT_ROLE';
    });
    mockSystem.get.mockImplementation((prop) => {
      return prop === 'AWS_WEB_IDENTITY_TOKEN_FILE'
        ? '/var/run/secrets/aws/token'
        : undefined;
    });

    // This file does not clear mocks between tests, and an earlier one exercises
    // the Azure branch -- so reset it before asserting it stays untouched here.
    (getAwsCredentialsFromAzureIdentity as jest.Mock).mockClear();

    (getAwsCredentialsFromWebIdentityToken as jest.Mock).mockResolvedValue({
      AccessKeyId: 'web-identity-key',
      SecretAccessKey: 'web-identity-secret',
      SessionToken: 'web-identity-token',
    });

    try {
      const client = getAwsClient(
        MockServiceClient,
        { accessKeyId: '', secretAccessKey: '' },
        region,
      );
      expect(typeof client.config.credentials).toBe('function');

      const result = await client.config.credentials();
      expect(result).toEqual({
        accessKeyId: 'web-identity-key',
        secretAccessKey: 'web-identity-secret',
        sessionToken: 'web-identity-token',
        expiration: undefined,
      });
      expect(getAwsCredentialsFromWebIdentityToken).toHaveBeenCalledWith(
        region,
      );
      expect(getAwsCredentialsFromAzureIdentity).not.toHaveBeenCalled();
    } finally {
      mockSystem.getBoolean.mockReturnValue(false);
      mockSystem.get.mockReturnValue(undefined);
    }
  });
});
