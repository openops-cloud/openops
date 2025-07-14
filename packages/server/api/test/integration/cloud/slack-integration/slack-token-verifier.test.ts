const systemMock = {
  ...jest.requireActual('@openops/server-shared').system,
  get: jest.fn(),
};
const loggerMock = {
  error: jest.fn(),
};
jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  AppSystemProp: {
    SLACK_APP_SIGNING_SECRET: 'SLACK_APP_SIGNING_SECRET',
  },
  system: systemMock,
  logger: loggerMock,
}));

const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  makeHttpRequest: jest.fn(),
};

jest.mock('@openops/common', () => openopsCommonMock);

import { SharedSystemProp, system } from '@openops/server-shared';
import { AxiosHeaders } from 'axios';
import { createHmac } from 'crypto';
import { FastifyRequest } from 'fastify';
import { verifySignature } from '../../../../src/app/slack/slack-token-verifier';

const oauthProxyUrl = system.get<string>(
  SharedSystemProp.INTERNAL_OAUTH_PROXY_URL,
);

describe('Slack token verifier', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test('should log error and return false if no timestamp or signature are provided', async () => {
    systemMock.get.mockReturnValue('mockedSignature');

    const result = await verifySignature({
      headers: {},
      rawBody: 'a body',
    } as unknown as FastifyRequest);

    expect(result).toBe(false);
    expect(openopsCommonMock.makeHttpRequest).not.toHaveBeenCalled();
    expect(loggerMock.error).toHaveBeenCalledWith(
      '[Slack signature verification] no signature or timestamp',
      {
        receivedSignature: undefined,
        timestamp: undefined,
      },
    );
  });

  test('should log error if it is a replay attack', async () => {
    systemMock.get.mockReturnValue('mockedSignature');

    const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString();
    const oldRequest = {
      headers: {
        'x-slack-request-timestamp': oldTimestamp,
        'x-slack-signature': 'v0=mockedSignature',
      },
      rawBody: 'a body',
    } as unknown as FastifyRequest;

    const result = await verifySignature(oldRequest);

    expect(result).toBe(false);
    expect(openopsCommonMock.makeHttpRequest).not.toHaveBeenCalled();
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining(
        '[Slack signature verification] timestamp is too old',
      ),
      expect.objectContaining({ timeDiff: expect.any(Number) }),
    );
  });

  test('should log error if signatures do not match', async () => {
    systemMock.get.mockReturnValue('mockedSignature');

    const result = await verifySignature({
      headers: {
        'x-slack-request-timestamp': Math.floor(Date.now() / 1000).toString(),
        'x-slack-signature': 'mockedSignature',
      },
      rawBody: 'a body',
    });

    expect(result).toBe(false);
    expect(openopsCommonMock.makeHttpRequest).not.toHaveBeenCalled();
    expect(loggerMock.error).toHaveBeenCalledWith(
      '[Slack signature verification] Signature length mismatch',
      expect.objectContaining({
        mySignature: expect.any(String),
        receivedSignature: 'mockedSignature',
      }),
    );
  });

  test('should return true if signature is valid', async () => {
    systemMock.get.mockReturnValue('mockedSigningSecret');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const baseString = `v0:${timestamp}:a body`;
    const correctSignature =
      'v0=' +
      createHmac('sha256', 'mockedSigningSecret')
        .update(baseString, 'utf8')
        .digest('hex');

    const result = await verifySignature({
      headers: {
        'x-slack-request-timestamp': timestamp,
        'x-slack-signature': correctSignature,
      },
      rawBody: 'a body',
    } as unknown as FastifyRequest);

    expect(result).toBe(true);
    expect(openopsCommonMock.makeHttpRequest).not.toHaveBeenCalled();
  });

  test('should verify signature via Lambda if signing secret is missing', async () => {
    systemMock.get.mockReturnValue(undefined);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    openopsCommonMock.makeHttpRequest.mockResolvedValueOnce({ result: true });

    const result = await verifySignature({
      headers: {
        'x-slack-request-timestamp': timestamp,
        'x-slack-signature': 'v0=mockedSignature',
      },
      rawBody: 'a body',
    });

    expect(result).toBe(true);
    expect(openopsCommonMock.makeHttpRequest).toHaveBeenCalledWith(
      'POST',
      `${oauthProxyUrl}/slack/interactions/verify`,
      new AxiosHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-slack-signature': 'v0=mockedSignature',
        'x-slack-request-timestamp': timestamp,
      }),
      'a body',
    );
  });

  test('should return false if Lambda verification fails', async () => {
    systemMock.get.mockReturnValue(undefined);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    openopsCommonMock.makeHttpRequest.mockResolvedValueOnce({
      result: false,
      error: 'Invalid signature',
    });

    const result = await verifySignature({
      headers: {
        'x-slack-request-timestamp': timestamp,
        'x-slack-signature': 'v0=mockedSignature',
      },
      rawBody: 'a body',
    } as unknown as FastifyRequest);

    expect(result).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith(
      '[Slack signature verification] error',
      { error: 'Invalid signature' },
    );
  });

  test('should log error if lambda verification throws', async () => {
    systemMock.get.mockReturnValue(undefined);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    openopsCommonMock.makeHttpRequest.mockRejectedValue(
      new Error('some error'),
    );

    const result = await verifySignature({
      headers: {
        'x-slack-request-timestamp': timestamp,
        'x-slack-signature': 'v0=mockedSignature',
      },
      rawBody: 'a body',
    } as unknown as FastifyRequest);

    expect(result).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith(
      '[Slack signature verification] error',
      { error: new Error('some error') },
    );
  });
});
