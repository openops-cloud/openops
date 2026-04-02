const resolve4 = jest.fn();
const resolve6 = jest.fn();
const getBoolean = jest.fn().mockReturnValue(true);
const getPublicUrl = jest.fn();

jest.mock('dns', () => ({ promises: { resolve4, resolve6 } }));
jest.mock('../../src/lib/system', () => ({
  system: {
    getBoolean,
    getOrThrow: jest.fn().mockReturnValue('x-forwarded-for'),
  },
  SharedSystemProp: {
    ENABLE_HOST_VALIDATION: 'ENABLE_HOST_VALIDATION',
    FRONTEND_URL: 'FRONTEND_URL',
  },
  AppSystemProp: { CLIENT_REAL_IP_HEADER: 'CLIENT_REAL_IP_HEADER' },
}));
jest.mock('../../src/lib/network-utils', () => ({
  networkUtls: { getPublicUrl },
}));

import {
  validateHost,
  validateHostAllowingPublicWebhookUrl,
} from '../../src/lib/host-validation';

describe('Host Validation', () => {
  beforeEach(() => {
    getBoolean.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should skip if host validation is disabled', async () => {
    getBoolean.mockReturnValue(false);
    const host = '127.0.0.1';
    await expect(validateHost(host)).resolves.toBeUndefined();
  });

  test('should skip for empty host', async () => {
    const host = '';
    await expect(validateHost(host)).resolves.toBeUndefined();
  });

  test('should throw for private IPv4 address', async () => {
    const host = '192.168.1.1';
    await expect(validateHost(host)).rejects.toThrow(
      'Host must not be an internal address',
    );
  });

  test('should throw for private IPv6 address', async () => {
    const host = 'fc00::1';
    await expect(validateHost(host)).rejects.toThrow(
      'Host must not be an internal address',
    );
  });

  test('should return for public IPv4 address', async () => {
    const host = '8.8.8.8';
    await expect(validateHost(host)).resolves.toBeUndefined();
  });

  test('should return for public IPv6 address', async () => {
    const host = '2001:4860:4860::8888';
    await expect(validateHost(host)).resolves.toBeUndefined();
  });

  test('should throw for private ipv4 DNS name', async () => {
    const host = 'private.example.com';
    resolve4.mockResolvedValue(['192.168.1.1']);
    resolve6.mockResolvedValue([]);
    await expect(validateHost(host)).rejects.toThrow(
      'Host must not be an internal address',
    );
  });

  test('should throw for private ipv6 DNS name', async () => {
    const host = 'private.example.com';
    resolve4.mockResolvedValue([]);
    resolve6.mockResolvedValue(['fc00::1']);
    await expect(validateHost(host)).rejects.toThrow(
      'Host must not be an internal address',
    );
  });

  test('should return for public DNS name', async () => {
    const host = 'public.example.com';
    resolve4.mockResolvedValue(['8.8.8.8']);
    resolve6.mockResolvedValue(['2001:4860:4860::8888']);
    await expect(validateHost(host)).resolves.toBeUndefined();
  });

  test('should return for public ipv4 DNS name', async () => {
    const host = 'public.example.com';
    resolve4.mockResolvedValue(['8.8.8.8']);
    resolve6.mockResolvedValue([]);
    await expect(validateHost(host)).resolves.toBeUndefined();
  });

  test('should throw for DNS resolution failure', async () => {
    const host = 'unknown.example.com';
    resolve4.mockRejectedValue('DNS resolution failed');
    resolve6.mockRejectedValue('DNS resolution failed');
    await expect(validateHost(host)).rejects.toThrow('Failed to resolve host');
  });

  test('should throw for URL that has private host', async () => {
    const host = 'https://private.example.com/hello';
    resolve4.mockResolvedValue(['10.100.0.0']);
    resolve6.mockRejectedValue(new Error('DNS resolution failed'));
    await expect(validateHost(host)).rejects.toThrow(
      'Host must not be an internal address',
    );
  });

  test('should validate first host if the URL has another host in a query parameter', async () => {
    const host = 'private.example.com/hacks?host=https://public.example.com';
    resolve4.mockImplementation((host: string) =>
      Promise.resolve(
        host === 'private.example.com' ? ['10.0.0.1'] : ['143.4.5.6'],
      ),
    );
    resolve6.mockRejectedValue(new Error('DNS resolution failed'));
    await expect(validateHost(host)).rejects.toThrow(
      'Host must not be an internal address',
    );
  });

  describe('validateHostAllowingPublicWebhookUrl', () => {
    test('should skip for empty url', async () => {
      const url = '';
      await expect(
        validateHostAllowingPublicWebhookUrl(url),
      ).resolves.toBeUndefined();
    });

    test('should allow public webhook url even if it resolves to private ip', async () => {
      const publicUrl = 'https://openops.example.com/';
      const webhookUrl =
        'https://openops.example.com/v1/webhooks/123456789012345678901/sync';
      getPublicUrl.mockResolvedValue(publicUrl);
      resolve4.mockResolvedValue(['127.0.0.1']);
      resolve6.mockResolvedValue([]);

      await expect(
        validateHostAllowingPublicWebhookUrl(webhookUrl),
      ).resolves.toBeUndefined();
    });

    test('should throw for internal host that is not the public webhook url', async () => {
      const publicUrl = 'https://openops.example.com/';
      const internalUrl =
        'https://10.0.0.1/v1/webhooks/123456789012345678901/sync';
      getPublicUrl.mockResolvedValue(publicUrl);
      resolve4.mockResolvedValue(['10.0.0.1']);
      resolve6.mockResolvedValue([]);

      await expect(
        validateHostAllowingPublicWebhookUrl(internalUrl),
      ).rejects.toThrow('Host must not be an internal address');
    });

    test('should throw for public webhook url with invalid id length', async () => {
      const publicUrl = 'https://openops.example.com/';
      const webhookUrl =
        'https://openops.example.com/v1/webhooks/too-short/sync';
      getPublicUrl.mockResolvedValue(publicUrl);
      resolve4.mockResolvedValue(['127.0.0.1']);
      resolve6.mockResolvedValue([]);

      await expect(
        validateHostAllowingPublicWebhookUrl(webhookUrl),
      ).rejects.toThrow('Host must not be an internal address');
    });

    test('should allow public host', async () => {
      const publicUrl = 'https://openops.example.com/';
      const somePublicUrl = 'https://google.com';
      getPublicUrl.mockResolvedValue(publicUrl);
      resolve4.mockResolvedValue(['8.8.8.8']);
      resolve6.mockResolvedValue([]);

      await expect(
        validateHostAllowingPublicWebhookUrl(somePublicUrl),
      ).resolves.toBeUndefined();
    });

    test('should throw error for DNS resolution failure on non-webhook URL', async () => {
      const publicUrl = 'https://openops.example.com/';
      const unknownUrl = 'https://unknown.example.com';
      getPublicUrl.mockResolvedValue(publicUrl);
      resolve4.mockRejectedValue(new Error('DNS resolution failed'));
      resolve6.mockRejectedValue(new Error('DNS resolution failed'));

      await expect(
        validateHostAllowingPublicWebhookUrl(unknownUrl),
      ).rejects.toThrow('Failed to resolve host');
    });
  });
});
