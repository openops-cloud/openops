jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('random uuid'),
}));

const mockSend = jest.fn().mockResolvedValue({
  Credentials: 'some credentials',
  Account: 'some account',
});

const mockAssumeRoleCommand = jest.fn().mockImplementation(() => {
  return {};
});

const mockGetCallerIdentityCommand = jest.fn().mockImplementation(() => {
  return {};
});

const mockCreateStsClient = jest.fn();

jest.mock('@aws-sdk/client-sts', () => {
  return {
    STSClient: mockCreateStsClient.mockImplementation(() => {
      return {
        send: mockSend,
      };
    }),
    AssumeRoleCommand: mockAssumeRoleCommand,
    GetCallerIdentityCommand: mockGetCallerIdentityCommand,
  };
});

jest.mock('@aws-sdk/client-ec2');

const ACCESS_KEY_ID = 'random accessKeyId';
const SECRET_ACCESS_KEY = 'random secretAccessKey';
const DEFAULT_REGION = 'random defaultRegion';

import { assumeRole, getAccountId } from '../src/lib/aws/sts-common';

describe('assumeRole tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return assumed-role credentials', async () => {
    const result = await assumeRole(
      ACCESS_KEY_ID,
      SECRET_ACCESS_KEY,
      DEFAULT_REGION,
      'some role arn',
      'external id',
    );

    expect(result).toBe('some credentials');

    expect(mockCreateStsClient).toHaveBeenCalledWith({
      region: DEFAULT_REGION,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
        sessionToken: undefined,
      },
    });

    expect(mockAssumeRoleCommand).toHaveBeenCalledWith({
      RoleArn: 'some role arn',
      ExternalId: 'external id',
      RoleSessionName: 'openops-random uuid',
    });

    expect(mockSend).toHaveBeenCalledWith({});
  });
});

describe('getAccountId tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return account', async () => {
    const result = await getAccountId(
      {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
        endpoint: 'some endpoint',
      },
      DEFAULT_REGION,
    );

    expect(result).toBe('some account');

    expect(mockCreateStsClient).toHaveBeenCalledWith({
      region: DEFAULT_REGION,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
        sessionToken: undefined,
      },
      endpoint: 'some endpoint',
    });

    expect(mockGetCallerIdentityCommand).toHaveBeenCalledWith({});

    expect(mockSend).toHaveBeenCalledWith({});
  });

  test('should use session token', async () => {
    await getAccountId(
      {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
        sessionToken: 'some token',
      },
      DEFAULT_REGION,
    );

    expect(mockCreateStsClient).toHaveBeenCalledWith({
      region: DEFAULT_REGION,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
        sessionToken: 'some token',
      },
    });
  });
});
