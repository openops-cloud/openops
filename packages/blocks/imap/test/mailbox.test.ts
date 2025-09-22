import { PropertyContext } from '@openops/blocks-framework';
import { mailbox } from '../src/lib/common/mailbox';

jest.mock('../src/lib/common/build-client', () => {
  return {
    buildClient: jest.fn(() => mockImapClient),
  };
});

const mockImapClient = {
  connect: jest.fn(),
  list: jest.fn(async () => [] as { name: string; path: string }[]),
  logout: jest.fn(),
};

function resetMocks() {
  mockImapClient.connect.mockClear();
  mockImapClient.list.mockClear();
  mockImapClient.logout.mockClear();
}

describe('mailbox.options', () => {
  const auth = {
    host: 'imap.example.com',
    port: 993,
    tls: true,
    username: 'user@example.com',
    password: 'secret',
  };

  beforeEach(() => {
    resetMocks();
  });

  test('returns mapped options from mailbox list and disabled=false', async () => {
    mockImapClient.list.mockResolvedValueOnce([
      { name: 'INBOX', path: 'INBOX' },
      { name: 'Sent', path: 'Sent' },
      { name: 'Archive/2025', path: 'Archive/2025' },
    ]);

    const res = await mailbox.options({ auth }, {} as PropertyContext);

    expect(res.disabled).toBe(false);
    expect(res.options).toEqual([
      { label: 'INBOX', value: 'INBOX' },
      { label: 'Sent', value: 'Sent' },
      { label: 'Archive/2025', value: 'Archive/2025' },
    ]);

    expect(mockImapClient.connect).toHaveBeenCalledTimes(1);
    expect(mockImapClient.list).toHaveBeenCalledTimes(1);
    expect(mockImapClient.logout).toHaveBeenCalledTimes(1);
  });

  test('handles empty mailbox list', async () => {
    mockImapClient.list.mockResolvedValueOnce([]);

    const res = await mailbox.options({ auth }, {} as PropertyContext);

    expect(res.disabled).toBe(false);
    expect(res.options).toEqual([]);

    expect(mockImapClient.connect).toHaveBeenCalledTimes(1);
    expect(mockImapClient.list).toHaveBeenCalledTimes(1);
    expect(mockImapClient.logout).toHaveBeenCalledTimes(1);
  });

  test('always logs out even if list throws', async () => {
    mockImapClient.list.mockRejectedValueOnce(new Error('IMAP list failed'));

    await expect(
      mailbox.options({ auth }, {} as PropertyContext),
    ).rejects.toThrow('IMAP list failed');

    expect(mockImapClient.connect).toHaveBeenCalledTimes(1);
    expect(mockImapClient.list).toHaveBeenCalledTimes(1);
    expect(mockImapClient.logout).toHaveBeenCalledTimes(1);
  });
});
