import dayjs from 'dayjs';
import { fetchEmails } from '../src/lib/common/fetch-emails';

const mockConnect = jest.fn();
const mockLogout = jest.fn();
const mockGetMailboxLock = jest.fn();
const mockLock = { release: jest.fn() };
const mockFetch = jest.fn();

jest.mock('../src/lib/common/build-client', () => ({
  buildClient: jest.fn(() => ({
    connect: mockConnect,
    logout: mockLogout,
    getMailboxLock: mockGetMailboxLock,
    fetch: mockFetch,
  })),
}));

const mockBuildImapSearch = jest.fn();
jest.mock('../src/lib/common/build-search', () => ({
  buildImapSearch: jest.fn((args) => mockBuildImapSearch(args)),
}));

const mockParseMailFromBuffer = jest.fn();
jest.mock('../src/lib/common/parse-mail', () => ({
  parseMailFromBuffer: jest.fn((buf) => mockParseMailFromBuffer(buf)),
}));

function makeAsyncIterable<T>(items: T[]): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        next: async () => {
          if (i < items.length) {
            return { value: items[i++], done: false } as IteratorResult<T>;
          }
          return { value: undefined, done: true } as IteratorResult<T>;
        },
      } as AsyncIterator<T>;
    },
  } as AsyncIterable<T>;
}

describe('fetchEmails', () => {
  const auth = {
    host: 'imap.example.com',
    port: 993,
    tls: true,
    username: 'user',
    password: 'pass',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMailboxLock.mockResolvedValue(mockLock);
  });

  test('fetches, parses, and returns messages with epochMilliSeconds; skips without source', async () => {
    const date1 = new Date('2023-01-01T00:00:00.000Z');
    const date2 = new Date('2024-02-02T12:34:56.000Z');

    const msg1 = { source: Buffer.from('raw1') };
    const msg2 = {};
    const msg3 = { source: Buffer.from('raw3') };
    mockFetch.mockReturnValue(makeAsyncIterable([msg1, msg2, msg3]));

    mockParseMailFromBuffer.mockImplementation((buf: Buffer) => {
      if (buf.toString() === 'raw1') {
        return Promise.resolve({ date: date1 });
      }
      if (buf.toString() === 'raw3') {
        return Promise.resolve({ date: date2 });
      }
      throw new Error('unexpected buffer');
    });

    mockBuildImapSearch.mockReturnValue({ some: 'query' });

    const result = await fetchEmails({
      auth,
      lastEpochMilliSeconds: 123,
      mailbox: 'INBOX',
      recipients: ['To@Example.com '],
      cc: [' CC@Example.com'],
      senders: [' From@Example.com '],
      subject: ' Test ',
    });

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockGetMailboxLock).toHaveBeenCalledWith('INBOX');
    expect(mockLock.release).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledTimes(1);

    expect(mockBuildImapSearch).toHaveBeenCalledWith({
      lastEpochMilliSeconds: 123,
      recipients: ['To@Example.com '],
      cc: [' CC@Example.com'],
      senders: [' From@Example.com '],
      subject: ' Test ',
    });
    expect(mockFetch).toHaveBeenCalledWith({ some: 'query' }, { source: true });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      epochMilliSeconds: dayjs(date1).valueOf(),
    });
    expect(result[1]).toMatchObject({
      epochMilliSeconds: dayjs(date2).valueOf(),
    });
  });

  test('returns empty list when no messages are fetched', async () => {
    mockFetch.mockReturnValue(makeAsyncIterable([]));
    mockBuildImapSearch.mockReturnValue({});

    const result = await fetchEmails({
      auth,
      lastEpochMilliSeconds: 0,
      mailbox: 'INBOX',
    });

    expect(result).toEqual([]);
    expect(mockLock.release).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
