const httpClientMock = jest.fn();
jest.mock('@openops/blocks-common', () => ({
  AuthenticationType: {
    BEARER_TOKEN: 'BEARER_TOKEN',
  },
  httpClient: {
    sendRequest: httpClientMock,
  },
  HttpMethod: {
    GET: 'GET',
  },
}));

jest.mock('@openops/server-shared', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import { logger } from '@openops/server-shared';
import {
  getSlackUsers,
  makeSlackRequest,
} from '../src/lib/common/slack-api-request';

describe('Slack Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSlackUsers', () => {
    test('should fetch Slack users successfully', async () => {
      const mockUsers = [
        { id: 'U1', name: 'User1', profile: { email: 'user1@example.com' } },
        { id: 'U2', name: 'User2', profile: { email: 'user2@example.com' } },
      ];

      httpClientMock.mockResolvedValueOnce({
        body: {
          ok: true,
          members: mockUsers,
          response_metadata: { next_cursor: '' },
        },
      });

      const accessToken = 'mockAccessToken';
      const result = await getSlackUsers(accessToken);

      expect(result).toEqual(mockUsers);
      expect(httpClientMock).toHaveBeenCalledTimes(1);
    });

    test('should handle error from Slack API', async () => {
      httpClientMock.mockResolvedValueOnce({
        body: {
          ok: false,
          error: 'mock_error',
          response_metadata: { next_cursor: '' },
        },
      });

      const accessToken = 'mockAccessToken';

      await expect(getSlackUsers(accessToken)).rejects.toThrow(
        'Error getting info from slack: mock_error',
      );
      expect(httpClientMock).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('makeSlackRequest', () => {
    afterEach(() => {
      httpClientMock.mockReset();
    });

    test('should make multiple requests if there is pagination', async () => {
      const mockResponsePage1 = {
        body: {
          ok: true,
          members: [
            {
              id: 'U1',
              name: 'User1',
              profile: { email: 'user1@example.com' },
            },
          ],
          response_metadata: { next_cursor: 'cursor1' },
        },
      };

      const mockResponsePage2 = {
        body: {
          ok: true,
          members: [
            {
              id: 'U2',
              name: 'User2',
              profile: { email: 'user2@example.com' },
            },
          ],
          response_metadata: { next_cursor: '' },
        },
      };

      httpClientMock
        .mockResolvedValueOnce(mockResponsePage1)
        .mockResolvedValueOnce(mockResponsePage2);

      const token = 'mockToken';
      const result = await makeSlackRequest(
        token,
        'users.list',
        (body) => body.members,
      );

      expect(result).toEqual([
        { id: 'U1', name: 'User1', profile: { email: 'user1@example.com' } },
        { id: 'U2', name: 'User2', profile: { email: 'user2@example.com' } },
      ]);
      expect(httpClientMock).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        'Slack data retrieved successfully. Number of requests: 2',
        { slackEndpoint: 'users.list', responseSize: 2, numberOfRequests: 2 },
      );
    });

    test('should respect the limit parameter', async () => {
      const mockResponse1 = {
        body: {
          ok: true,
          members: [
            {
              id: 'U1',
              name: 'User1',
              profile: { email: 'user1@example.com' },
            },
          ],
          response_metadata: { next_cursor: 'cursor' },
        },
      };

      const mockResponse2 = {
        body: {
          ok: true,
          members: [
            {
              id: 'U2',
              name: 'User2',
              profile: { email: 'user2@example.com' },
            },
          ],
          response_metadata: { next_cursor: '' },
        },
      };

      httpClientMock
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const token = 'mockToken';
      const result = await makeSlackRequest(
        token,
        'users.list',
        (body) => body.members,
        1,
      );

      expect(result).toEqual([
        { id: 'U1', name: 'User1', profile: { email: 'user1@example.com' } },
      ]);
      expect(httpClientMock).toHaveBeenCalledTimes(1);
      expect(httpClientMock.mock.calls[0][0].queryParams).toEqual({
        limit: '1',
        cursor: '',
      });
    });

    test('should pass default limit if not provided', async () => {
      const mockResponse1 = {
        body: {
          ok: true,
          members: [
            {
              id: 'U1',
              name: 'User1',
              profile: { email: 'user1@example.com' },
            },
          ],
          response_metadata: { next_cursor: 'cursor' },
        },
      };

      const mockResponse2 = {
        body: {
          ok: true,
          members: [
            {
              id: 'U2',
              name: 'User2',
              profile: { email: 'user2@example.com' },
            },
          ],
          response_metadata: { next_cursor: '' },
        },
      };

      httpClientMock
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const token = 'mockToken';
      const result = await makeSlackRequest(
        token,
        'users.list',
        (body) => body.members,
      );

      expect(result).toEqual([
        { id: 'U1', name: 'User1', profile: { email: 'user1@example.com' } },
        { id: 'U2', name: 'User2', profile: { email: 'user2@example.com' } },
      ]);
      expect(httpClientMock).toHaveBeenCalledTimes(2);

      expect(httpClientMock.mock.calls[0][0].queryParams).toEqual({
        limit: '1200',
        cursor: '',
      });
      expect(httpClientMock.mock.calls[1][0].queryParams).toEqual({
        limit: '1200',
        cursor: 'cursor',
      });
    });

    test('should handle errors from Slack API', async () => {
      httpClientMock.mockResolvedValue({
        body: {
          ok: false,
          error: 'mock_error',
          response_metadata: { next_cursor: '' },
        },
      });

      const token = 'mockToken';

      await expect(
        makeSlackRequest(token, 'users.list', (body) => body.members),
      ).rejects.toThrow('Error getting info from slack: mock_error');
      expect(httpClientMock).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
