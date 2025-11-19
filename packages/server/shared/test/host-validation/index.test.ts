const resolve4 = jest.fn();
const resolve6 = jest.fn();
const getBoolean = jest.fn().mockReturnValue(true);

jest.mock('dns', () => ({ promises: { resolve4, resolve6 } }));
jest.mock('../../src/lib/system', () => ({
  system: { getBoolean },
  SharedSystemProp: { ENABLE_HOST_VALIDATION: 'ENABLE_HOST_VALIDATION' },
}));

import { validateHost } from '../../src/lib/host-validation';

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
});
