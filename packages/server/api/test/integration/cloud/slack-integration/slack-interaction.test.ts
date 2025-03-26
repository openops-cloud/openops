const verifySignatureMock = jest.fn();

jest.mock('../../../../src/app/slack/slack-token-verifier', () => ({
  verifySignature: verifySignatureMock,
}));

const axiosGetMock = jest.fn();
const axiosPostMock = jest.fn();
const axiosRequestMock = jest.fn();

jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: axiosGetMock,
    post: axiosPostMock,
    put: jest.fn(),
    delete: jest.fn(),
    request: axiosRequestMock,
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  };

  const mockAxios = {
    create: jest.fn(() => mockAxiosInstance),
    ...mockAxiosInstance,
  };

  return {
    Axios: mockAxios,
    __esModule: true,
    default: mockAxios,
    ...mockAxios,
  };
});

const loggerMock = jest.fn();

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  logger: {
    info: loggerMock,
    debug: loggerMock,
    error: loggerMock,
  },
}));

const sendEphemeralMessageMock = jest.fn();
jest.mock('../../../../src/app/slack/ephemeral-message', () => ({
  sendEphemeralMessage: sendEphemeralMessageMock,
}));

import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { setupServer } from '../../../../src/app/server';
import { CreateSlackInteractionRequest } from '../../../../src/app/slack/slack-interaction-module';
let app: FastifyInstance | null = null;

beforeAll(async () => {
  await databaseConnection().initialize();
  app = await setupServer();
});

afterAll(async () => {
  await databaseConnection().destroy();
  await app?.close();
});

describe('Slack API', () => {
  beforeEach(async () => {
    jest.resetAllMocks();
  });

  describe('POST', () => {
    test('should return unauthorized if token signature is not valid', async () => {
      verifySignatureMock.mockReturnValueOnce(false);

      const payload = JSON.stringify({});

      const response = await makeRequest(payload);

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('should return bad request if payload is not valid', async () => {
      verifySignatureMock.mockReturnValueOnce(true);

      const response = await makeRequest('invalid payload');

      expect(response?.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(response?.json()).toEqual({
        text: 'Invalid slack interaction payload',
      });
    });

    test('should return bad request if payload has no actions', async () => {
      verifySignatureMock.mockReturnValueOnce(true);

      const payload = JSON.stringify({});
      const response = await makeRequest(payload);

      expect(response?.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(response?.json()).toEqual({
        text: 'No slack interaction actions',
      });
    });

    test('should return 200 Ok if message is disabled', async () => {
      verifySignatureMock.mockReturnValueOnce(true);

      const payload = JSON.stringify({
        actions: [
          {
            type: 'some type',
          },
        ],
        message: {
          metadata: {
            event_payload: {
              messageDisabled: true,
            },
          },
        },
      });

      const response = await makeRequest(payload);

      expect(response?.statusCode).toBe(StatusCodes.OK);
      expect(response?.json()).toEqual({
        text: 'Message interactions are disabled',
      });
    });

    test('should return 200 Ok if action is not a button', async () => {
      verifySignatureMock.mockReturnValueOnce(true);

      const payload = JSON.stringify({
        actions: [
          {
            type: 'some type',
          },
        ],
        message: {
          metadata: {
            event_payload: {},
          },
        },
      });

      const response = await makeRequest(payload);

      expect(response?.statusCode).toBe(StatusCodes.OK);
      expect(response?.json()).toEqual({ text: 'Received interaction' });
    });

    test('should return 200 and send an ephemeral message if the message is a test message', async () => {
      verifySignatureMock.mockReturnValueOnce(true);
      sendEphemeralMessageMock.mockResolvedValueOnce({});

      const payload = JSON.stringify({
        actions: [
          {
            type: 'button',
            action_id: 'some_id',
          },
        ],
        user: {
          id: 'some_user_id',
          name: 'some_user_name',
        },
        message: {
          metadata: {
            event_payload: {
              isTest: true,
              resumeUrl: 'http://some-resume-url.com?test=1',
            },
          },
        },
        response_url:
          'https://hooks.slack.com/actions/XXXXXXXX/XXXXXXXXX/XXXXXXXXX',
      });

      const response = await makeRequest(payload);

      expect(response?.statusCode).toBe(StatusCodes.OK);
      expect(axiosGetMock).not.toHaveBeenCalled();
      expect(sendEphemeralMessageMock).toHaveBeenCalledTimes(1);
      expect(sendEphemeralMessageMock).toHaveBeenCalledWith({
        ephemeralText:
          'Slack interactions are only available when running the entire workflow.',
        responseUrl:
          'https://hooks.slack.com/actions/XXXXXXXX/XXXXXXXXX/XXXXXXXXX',
        userId: 'some_user_id',
      });
    });

    test('should do nothing and return 200 if it is not a test message but there is no resume url', async () => {
      verifySignatureMock.mockReturnValueOnce(true);

      const payload = JSON.stringify({
        actions: [
          {
            type: 'button',
            action_id: 'some_id',
          },
        ],
        user: {
          id: 'some_user_id',
          name: 'some_user_name',
        },
        message: {
          metadata: {
            event_payload: {
              isTest: false,
            },
          },
        },
        response_url:
          'https://hooks.slack.com/actions/XXXXXXXX/XXXXXXXXX/XXXXXXXXX',
      });

      const response = await makeRequest(payload);

      expect(response?.statusCode).toBe(StatusCodes.OK);
      expect(sendEphemeralMessageMock).not.toHaveBeenCalled();
      expect(axiosGetMock).not.toHaveBeenCalled();
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function makeRequest(payload: string): Promise<any> {
      const request: CreateSlackInteractionRequest = {
        payload,
      };

      const response = await app?.inject({
        method: 'POST',
        url: '/v1/slack/interactions',
        body: request,
        headers: {
          authorization: 'some token',
        },
      });

      return response;
    }
  });
});
