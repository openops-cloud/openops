/* eslint-disable @typescript-eslint/no-explicit-any */
import { makeHttpRequest } from '@openops/common';
import {
  AppSystemProp,
  logger,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import { AxiosHeaders } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';

const oauthProxyUrl = system.get<string>(
  SharedSystemProp.INTERNAL_OAUTH_PROXY_URL,
);

export const verifySignature = async (req: any): Promise<boolean> => {
  const timestamp = req.headers['x-slack-request-timestamp'];
  const receivedSignature = req.headers['x-slack-signature'] as string;

  if (!receivedSignature || !timestamp) {
    logger.error('[Slack signature verification] no signature or timestamp', {
      receivedSignature,
      timestamp,
    });
    return false;
  }

  const signingSecret = system.get(AppSystemProp.SLACK_APP_SIGNING_SECRET);
  if (signingSecret) {
    return verifyWithLocalSignature(
      timestamp,
      receivedSignature,
      req.rawBody,
      signingSecret,
    );
  }

  return verifyWithOAuthProxy(receivedSignature, timestamp, req.rawBody);
};

async function verifyWithOAuthProxy(
  receivedSignature: string,
  timestamp: string,
  rawBody: any,
): Promise<boolean> {
  try {
    const response = await makeHttpRequest<{ result: boolean; error?: string }>(
      'POST',
      `${oauthProxyUrl}/slack/interactions/verify`,
      new AxiosHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-slack-signature': receivedSignature,
        'x-slack-request-timestamp': timestamp,
      }),
      rawBody,
    );

    if (response?.error) {
      logger.error(`[Slack signature verification] error`, {
        error: response.error,
      });
    }

    return response?.result;
  } catch (error) {
    logger.error(`[Slack signature verification] error`, { error });
    return false;
  }
}

function verifyWithLocalSignature(
  timestamp: string,
  receivedSignature: string,
  rawBody: any,
  signingSecret: string,
): boolean {
  const timeDiff = Math.floor(Date.now() / 1000) - Number(timestamp);
  const isReplayAttack = timeDiff > 300;

  if (isReplayAttack) {
    logger.error(
      `[Slack signature verification] timestamp is too old: ${timeDiff}`,
      { timeDiff },
    );
    return false;
  }

  const baseString = `v0:${timestamp}:${rawBody}`;
  const mySignature =
    'v0=' +
    createHmac('sha256', signingSecret)
      .update(baseString, 'utf8')
      .digest('hex');

  if (mySignature.length !== receivedSignature.length) {
    logger.error('[Slack signature verification] Signature length mismatch', {
      mySignature,
      receivedSignature,
    });
    return false;
  }

  const result = timingSafeEqual(
    Buffer.from(mySignature, 'utf8'),
    Buffer.from(receivedSignature, 'utf8'),
  );

  if (!result) {
    logger.error('[Slack signature verification] signatures do not match', {
      mySignature,
      receivedSignature,
      timestamp,
      rawBody,
    });
  }

  return result;
}
