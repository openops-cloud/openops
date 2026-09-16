const mockReadFile = jest.fn();
jest.mock('node:fs/promises', () => ({
  readFile: (...args: any[]) => mockReadFile(...args),
}));

const mockSystemGetOrThrow = jest.fn();
jest.mock('@openops/server-shared', () => ({
  SharedSystemProp: {
    AWS_WEB_IDENTITY_TOKEN_FILE: 'AWS_WEB_IDENTITY_TOKEN_FILE',
    AWS_FEDERATION_ROLE_ARN: 'AWS_FEDERATION_ROLE_ARN',
  },
  system: {
    getOrThrow: (...args: any[]) => mockSystemGetOrThrow(...args),
  },
}));

jest.mock('@aws-sdk/client-sts', () => ({
  STSClient: jest.fn(),
  AssumeRoleWithWebIdentityCommand: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: jest.fn() }));

import {
  AssumeRoleWithWebIdentityCommand,
  STSClient,
} from '@aws-sdk/client-sts';
import { v4 as uuidv4 } from 'uuid';
import {
  clearWebIdentityFederationCache,
  getAwsCredentialsFromWebIdentityToken,
} from '../../src/lib/aws/web-identity-federation';

const REGION = 'us-east-1';
const TOKEN_FILE = '/var/run/secrets/aws/token';
const ROLE_ARN = 'arn:aws:iam::123456789012:role/OpenOps-AssumeRole-Dev';

const mockSend = jest.fn();

function credentialsExpiringIn(minutes: number) {
  return {
    AccessKeyId: 'AKIA',
    SecretAccessKey: 'SECRET',
    SessionToken: 'TOKEN',
    Expiration: new Date(Date.now() + minutes * 60 * 1000),
  };
}

describe('web-identity-federation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearWebIdentityFederationCache();
    (uuidv4 as jest.Mock).mockReturnValue('mock-uuid');
    (STSClient as unknown as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
    mockReadFile.mockResolvedValue('projected.jwt.token');
    mockSystemGetOrThrow.mockImplementation((prop: string) =>
      prop === 'AWS_WEB_IDENTITY_TOKEN_FILE' ? TOKEN_FILE : ROLE_ARN,
    );
  });

  test('reads the projected token and exchanges it for credentials', async () => {
    const credentials = credentialsExpiringIn(60);
    mockSend.mockResolvedValue({ Credentials: credentials });

    const result = await getAwsCredentialsFromWebIdentityToken(REGION);

    expect(result).toEqual(credentials);
    expect(mockReadFile).toHaveBeenCalledWith(TOKEN_FILE, 'utf8');
    expect(STSClient).toHaveBeenCalledWith({ region: REGION });
    expect(AssumeRoleWithWebIdentityCommand).toHaveBeenCalledWith({
      RoleArn: ROLE_ARN,
      RoleSessionName: 'openops-mock-uuid',
      WebIdentityToken: 'projected.jwt.token',
    });
  });

  test('trims the token, since a trailing newline breaks the exchange', async () => {
    mockReadFile.mockResolvedValue('projected.jwt.token\n');
    mockSend.mockResolvedValue({ Credentials: credentialsExpiringIn(60) });

    await getAwsCredentialsFromWebIdentityToken(REGION);

    expect(AssumeRoleWithWebIdentityCommand).toHaveBeenCalledWith(
      expect.objectContaining({ WebIdentityToken: 'projected.jwt.token' }),
    );
  });

  test('serves the cached credentials without re-reading the token', async () => {
    mockSend.mockResolvedValue({ Credentials: credentialsExpiringIn(60) });

    await getAwsCredentialsFromWebIdentityToken(REGION);
    const second = await getAwsCredentialsFromWebIdentityToken(REGION);

    expect(second?.AccessKeyId).toBe('AKIA');
    expect(mockReadFile).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('refreshes inside the five minute buffer before expiry', async () => {
    mockSend.mockResolvedValueOnce({ Credentials: credentialsExpiringIn(3) });
    await getAwsCredentialsFromWebIdentityToken(REGION);

    mockSend.mockResolvedValueOnce({ Credentials: credentialsExpiringIn(60) });
    await getAwsCredentialsFromWebIdentityToken(REGION);

    // The kubelet rotates the file, so a refresh has to read it again.
    expect(mockReadFile).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  test('clearing the cache forces a new exchange', async () => {
    mockSend.mockResolvedValue({ Credentials: credentialsExpiringIn(60) });

    await getAwsCredentialsFromWebIdentityToken(REGION);
    clearWebIdentityFederationCache();
    await getAwsCredentialsFromWebIdentityToken(REGION);

    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  test('propagates a failure to read the token file', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    await expect(getAwsCredentialsFromWebIdentityToken(REGION)).rejects.toThrow(
      'ENOENT',
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('does not cache when STS returns no credentials', async () => {
    mockSend.mockResolvedValue({});

    const result = await getAwsCredentialsFromWebIdentityToken(REGION);

    expect(result).toBeUndefined();
    await getAwsCredentialsFromWebIdentityToken(REGION);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});
