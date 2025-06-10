const mockSystem = { getBoolean: jest.fn().mockReturnValue(false) };
jest.mock('@openops/server-shared', () => ({
  system: mockSystem,
  SharedSystemProp: {
    AWS_ENABLE_IMPLICIT_ROLE: 'AWS_ENABLE_IMPLICIT_ROLE',
  },
}));

import { getAwsClient } from '../../src/lib/aws/get-client';

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
    mockSystem.getBoolean.mockReturnValue(true);
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
});
