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
    const userUrl = 'https://example.com/webhook';
    const result = await validateAndRewritePublicWebhookUrl(userUrl);
    expect(result).toBe(userUrl);
    expect(validateHost).toHaveBeenCalledWith(userUrl);
  });

  it('should rewrite the URL if it matches the public URL origin and valid webhook path', async () => {
    const error = new Error('Host must not be an internal address');
    (validateHost as jest.Mock).mockRejectedValue(error);
    (networkUtls.getPublicUrl as jest.Mock).mockResolvedValue(
      'https://public.openops.com',
    );
    (networkUtls.getInternalApiUrl as jest.Mock).mockReturnValue(
      'http://internal-api:3000',
    );

    const userUrl =
      'https://public.openops.com/v1/webhooks/123456789012345678901/sync';
    const result = await validateAndRewritePublicWebhookUrl(userUrl);

    expect(result).toBe(
      'http://internal-api:3000/v1/webhooks/123456789012345678901/sync',
    );
  });

  it('should rewrite the URL when public URL has a base path', async () => {
    const error = new Error('Host must not be an internal address');
    (validateHost as jest.Mock).mockRejectedValue(error);
    (networkUtls.getPublicUrl as jest.Mock).mockResolvedValue(
      'https://openops.com/',
    );
    (networkUtls.getInternalApiUrl as jest.Mock).mockReturnValue(
      'http://internal-api:3000/api',
    );

    const userUrl =
      'https://openops.com/api/v1/webhooks/123456789012345678901/sync';
    const result = await validateAndRewritePublicWebhookUrl(userUrl);

    expect(result).toBe(
      'http://internal-api:3000/api/v1/webhooks/123456789012345678901/sync',
    );
  });

  it('should throw the original error if origin does not match public URL origin', async () => {
    const error = new Error('Host must not be an internal address');
    (validateHost as jest.Mock).mockRejectedValue(error);
    (networkUtls.getPublicUrl as jest.Mock).mockResolvedValue(
      'https://public.openops.com',
    );
    (networkUtls.getInternalApiUrl as jest.Mock).mockReturnValue(
      'http://internal-api:3000',
    );

    const userUrl =
      'https://other-domain.com/v1/webhooks/123456789012345678901/sync';

    await expect(validateAndRewritePublicWebhookUrl(userUrl)).rejects.toThrow(
      error,
    );
  });

  it('should throw the original error if the path does not match the webhook pattern', async () => {
    const error = new Error('Host must not be an internal address');
    (validateHost as jest.Mock).mockRejectedValue(error);
    (networkUtls.getPublicUrl as jest.Mock).mockResolvedValue(
      'https://public.openops.com',
    );
    (networkUtls.getInternalApiUrl as jest.Mock).mockReturnValue(
      'http://internal-api:3000',
    );

    const userUrl = 'https://public.openops.com/v1/webhooks/invalid-id/sync';

    await expect(validateAndRewritePublicWebhookUrl(userUrl)).rejects.toThrow(
      error,
    );
  });

  it('should handle multiple slashes correctly during rewrite', async () => {
    const error = new Error('Host must not be an internal address');
    (validateHost as jest.Mock).mockRejectedValue(error);
    (networkUtls.getPublicUrl as jest.Mock).mockResolvedValue(
      'https://public.openops.com/',
    );
    (networkUtls.getInternalApiUrl as jest.Mock).mockReturnValue(
      'http://internal-api:3000/',
    );

    const userUrl =
      'https://public.openops.com/v1/webhooks/123456789012345678901/sync';
    const result = await validateAndRewritePublicWebhookUrl(userUrl);

    expect(result).toBe(
      'http://internal-api:3000/v1/webhooks/123456789012345678901/sync',
    );
  });
});
