import {
  AssumeRoleCommand,
  AssumeRoleWithWebIdentityCommand,
  STSClient,
} from '@aws-sdk/client-sts';
import { logger, system } from '@openops/server-shared';
import { v4 as uuidv4 } from 'uuid';
import {
  assumeTargetRoleViaAzureFederation,
  clearAzureFederationCache,
  getAwsCredentialsFromAzureIdentity,
} from '../../src/lib/aws/azure-aws-federation';
import { getAwsClient } from '../../src/lib/aws/get-client';

jest.mock('@aws-sdk/client-sts', () => {
  return {
    STSClient: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
    })),
    AssumeRoleCommand: jest.fn(),
    AssumeRoleWithWebIdentityCommand: jest.fn(),
  };
});
jest.mock('@openops/server-shared');
jest.mock('uuid');
jest.mock('../../src/lib/aws/get-client');

describe('azure-aws-federation', () => {
  const mockRegion = 'us-east-1';
  const mockRoleArn = 'arn:aws:iam::123456789012:role/target-role';
  const mockFederationRoleArn =
    'arn:aws:iam::123456789012:role/federation-role';
  const mockExternalId = 'external-id';
  const mockAccessToken = 'azure-access-token';
  const mockUuid = 'mock-uuid';

  beforeEach(() => {
    jest.clearAllMocks();
    clearAzureFederationCache();
    (uuidv4 as jest.Mock).mockReturnValue(mockUuid);
    globalThis.fetch = jest.fn();
  });

  describe('getAwsCredentialsFromAzureIdentity', () => {
    it('should return credentials when successful', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: mockAccessToken }),
      });

      (system.getOrThrow as jest.Mock).mockReturnValue(mockFederationRoleArn);

      const mockCredentials = {
        AccessKeyId: 'AKIA',
        SecretAccessKey: 'SECRET',
        SessionToken: 'TOKEN',
      };

      const mockSend = jest
        .fn()
        .mockResolvedValue({ Credentials: mockCredentials });
      (STSClient as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const result = await getAwsCredentialsFromAzureIdentity(mockRegion);

      expect(result).toEqual(mockCredentials);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('resource=api%3A%2F%2FAzureADTokenExchange'),
        expect.objectContaining({
          headers: { Metadata: 'true' },
        }),
      );
      expect(STSClient).toHaveBeenCalledWith({ region: mockRegion });
      expect(AssumeRoleWithWebIdentityCommand).toHaveBeenCalledWith({
        RoleArn: mockFederationRoleArn,
        RoleSessionName: `openops-${mockUuid}`,
        WebIdentityToken: mockAccessToken,
      });
    });

    it('should throw error when fetch fails', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(
        getAwsCredentialsFromAzureIdentity(mockRegion),
      ).rejects.toThrow('Failed to get Azure managed identity token.');
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('assumeTargetRoleViaAzureFederation', () => {
    it('should assume role and return credentials', async () => {
      const mockSourceCredentials = {
        AccessKeyId: 'AKIA-SOURCE',
        SecretAccessKey: 'SECRET-SOURCE',
        SessionToken: 'TOKEN-SOURCE',
      };

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: mockAccessToken }),
      });
      (system.getOrThrow as jest.Mock).mockReturnValue(mockFederationRoleArn);

      const mockStsClientForFederation = {
        send: jest
          .fn()
          .mockResolvedValue({ Credentials: mockSourceCredentials }),
      };
      const mockStsClientForTarget = {
        send: jest
          .fn()
          .mockResolvedValue({ Credentials: { AccessKeyId: 'AKIA-TARGET' } }),
      };

      (STSClient as jest.Mock).mockImplementationOnce(
        () => mockStsClientForFederation,
      );
      (getAwsClient as jest.Mock).mockReturnValue(mockStsClientForTarget);

      const result = await assumeTargetRoleViaAzureFederation(
        mockRegion,
        mockRoleArn,
        mockExternalId,
      );

      expect(result).toEqual({ AccessKeyId: 'AKIA-TARGET' });
      expect(getAwsClient).toHaveBeenCalledWith(
        STSClient,
        {
          accessKeyId: mockSourceCredentials.AccessKeyId,
          secretAccessKey: mockSourceCredentials.SecretAccessKey,
          sessionToken: mockSourceCredentials.SessionToken,
          endpoint: undefined,
        },
        mockRegion,
      );
      expect(AssumeRoleCommand).toHaveBeenCalledWith({
        RoleArn: mockRoleArn,
        ExternalId: mockExternalId,
        RoleSessionName: `openops-${mockUuid}`,
      });
    });

    it('should throw error if source credentials are missing required fields', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: mockAccessToken }),
      });
      (system.getOrThrow as jest.Mock).mockReturnValue(mockFederationRoleArn);

      const mockSend = jest
        .fn()
        .mockResolvedValue({ Credentials: { AccessKeyId: 'AKIA' } });
      (STSClient as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      await expect(
        assumeTargetRoleViaAzureFederation(mockRegion, mockRoleArn),
      ).rejects.toThrow('Failed to get AWS credentials from Azure identity');
    });
  });
});
