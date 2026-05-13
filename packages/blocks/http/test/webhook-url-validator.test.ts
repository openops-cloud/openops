import { networkUtls, validateHost } from '@openops/server-shared';
import { validateAndRewritePublicWebhookUrl } from '../src/lib/common/webhook-url-validator';

jest.mock('@openops/server-shared', () => ({
  validateHost: jest.fn(),
  networkUtls: {
    getPublicUrl: jest.fn(),
    getInternalApiUrl: jest.fn(),
  },
}));

describe('webhook-url-validator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the original URL if it is empty', async () => {
    const result = await validateAndRewritePublicWebhookUrl('');
    expect(result).toBe('');
  });

  it('should return the original URL if validateHost passes', async () => {
    (validateHost as jest.Mock).mockResolvedValue(undefined);
    (networkUtls.getPublicUrl as jest.Mock).mockResolvedValue(
      'https://app.openops.com/api',
    );
    (networkUtls.getInternalApiUrl as jest.Mock).mockReturnValue(
      'http://127.0.0.1:3000/',
    );
    const userUrl = 'https://example.com/webhook';
    const result = await validateAndRewritePublicWebhookUrl(userUrl);
    expect(result).toBe(userUrl);
    expect(validateHost).toHaveBeenCalledWith(userUrl);
    expect(networkUtls.getPublicUrl).toHaveBeenCalledTimes(1);
    expect(networkUtls.getInternalApiUrl).toHaveBeenCalledTimes(1);
  });

  test.each([
    [
      'rewrites when public URL has no base path and internal URL has no base path',
      'https://public.openops.com',
      'http://internal-api:3000',
      'https://public.openops.com/v1/webhooks/123456789012345678901/sync',
      'http://internal-api:3000/v1/webhooks/123456789012345678901/sync',
    ],
    [
      'rewrites when public URL has a base path and internal URL has no base path',
      'http://localhost:4200/api',
      'http://127.0.0.1:3000',
      'http://localhost:4200/api/v1/webhooks/123456789012345678901/sync',
      'http://127.0.0.1:3000/v1/webhooks/123456789012345678901/sync',
    ],
    [
      'rewrites when public URL has a base path and internal URL has a different base path',
      'https://public.openops.com/api',
      'http://internal-api:3000/internal',
      'https://public.openops.com/api/v1/webhooks/123456789012345678901/sync',
      'http://internal-api:3000/internal/v1/webhooks/123456789012345678901/sync',
    ],
    [
      'rewrites when public URL and internal URL share the same base path',
      'https://public.openops.com/api',
      'http://internal-api:3000/api',
      'https://public.openops.com/api/v1/webhooks/123456789012345678901/sync',
      'http://internal-api:3000/api/v1/webhooks/123456789012345678901/sync',
    ],
    [
      'rewrites when public URL ends with a trailing slash',
      'https://public.openops.com/api/',
      'http://internal-api:3000',
      'https://public.openops.com/api/v1/webhooks/123456789012345678901/sync',
      'http://internal-api:3000/v1/webhooks/123456789012345678901/sync',
    ],
    [
      'rewrites when internal URL ends with a trailing slash',
      'https://public.openops.com/api',
      'http://internal-api:3000/',
      'https://public.openops.com/api/v1/webhooks/123456789012345678901/sync',
      'http://internal-api:3000/v1/webhooks/123456789012345678901/sync',
    ],
    [
      'rewrites when both public and internal URLs end with trailing slashes',
      'https://public.openops.com/api/',
      'http://internal-api:3000/internal/',
      'https://public.openops.com/api/v1/webhooks/123456789012345678901/sync',
      'http://internal-api:3000/internal/v1/webhooks/123456789012345678901/sync',
    ],
    [
      'rewrites localhost public URL to internal host',
      'http://localhost:4200',
      'http://internal-api:3000',
      'http://localhost:4200/v1/webhooks/123456789012345678901/sync',
      'http://internal-api:3000/v1/webhooks/123456789012345678901/sync',
    ],
    [
      'rewrites when user URL already contains the internal base path after public host matching',
      'https://public.openops.com',
      'http://internal-api:3000/api',
      'https://public.openops.com/api/v1/webhooks/123456789012345678901/sync',
      'http://internal-api:3000/api/v1/webhooks/123456789012345678901/sync',
    ],
  ])(
    '%s',
    async (
      _caseName: string,
      publicUrl: string,
      internalApiUrl: string,
      userUrl: string,
      expectedUrl: string,
    ) => {
      (validateHost as jest.Mock).mockResolvedValue(undefined);
      (networkUtls.getPublicUrl as jest.Mock).mockResolvedValue(publicUrl);
      (networkUtls.getInternalApiUrl as jest.Mock).mockReturnValue(
        internalApiUrl,
      );

      await expect(validateAndRewritePublicWebhookUrl(userUrl)).resolves.toBe(
        expectedUrl,
      );

      expect(validateHost).not.toHaveBeenCalled();
      expect(networkUtls.getPublicUrl).toHaveBeenCalledTimes(1);
      expect(networkUtls.getInternalApiUrl).toHaveBeenCalledTimes(1);
    },
  );

  test.each([
    [
      'throws when user URL host does not match public URL host',
      'https://public.openops.com',
      'http://internal-api:3000',
      'https://other.openops.com/v1/webhooks/123456789012345678901/sync',
    ],
    [
      'throws when path is not a valid webhook sync path',
      'https://public.openops.com',
      'http://internal-api:3000',
      'https://public.openops.com/v1/webhooks/invalid/sync',
    ],
    [
      'throws when path does not match webhook route',
      'https://public.openops.com/api',
      'http://internal-api:3000',
      'https://public.openops.com/api/v1/other/123456789012345678901/sync',
    ],
    [
      'throws when webhook path has extra suffix',
      'https://public.openops.com',
      'http://internal-api:3000',
      'https://public.openops.com/v1/webhooks/123456789012345678901/sync/extra',
    ],
  ])(
    '%s',
    async (
      _caseName: string,
      publicUrl: string,
      internalApiUrl: string,
      userUrl: string,
    ) => {
      const originalError = new Error('Host must not be an internal address');

      (validateHost as jest.Mock).mockRejectedValue(originalError);
      (networkUtls.getPublicUrl as jest.Mock).mockResolvedValue(publicUrl);
      (networkUtls.getInternalApiUrl as jest.Mock).mockReturnValue(
        internalApiUrl,
      );

      await expect(validateAndRewritePublicWebhookUrl(userUrl)).rejects.toBe(
        originalError,
      );
    },
  );
});
