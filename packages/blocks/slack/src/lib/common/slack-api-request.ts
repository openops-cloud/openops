import {
  AuthenticationType,
  httpClient,
  HttpMethod,
  HttpRequest,
  QueryParams,
} from '@openops/blocks-common';
import { logger } from '@openops/server-shared';

export const MAX_RESULT_LIMIT = 1200;

export interface User {
  id: string;
  name: string;
  profile: {
    email?: string;
  };
}

export async function getUserByEmail(
  accessToken: string,
  email: string,
): Promise<User> {
  const result = await makeSingleRequest(accessToken, 'users.lookupByEmail', {
    email: email,
  });

  // https://api.slack.com/methods/users.lookupByEmail#examples
  return (result as any).user;
}

export function getSlackUsers(
  accessToken: string,
  limit?: number,
): Promise<User[]> {
  return makeSlackRequest(
    accessToken,
    'users.list',
    (body) => body.members,
    limit,
  );
}

export function getSlackChannels(
  accessToken: string,
  limit?: number,
): Promise<any[]> {
  return makeSlackRequest(
    accessToken,
    'conversations.list',
    (body) => body.channels,
    limit,
    { types: 'public_channel,private_channel' },
  );
}

export async function makeSlackRequest<T>(
  token: string,
  url: string,
  action: (body: any) => T[],
  limit?: number,
  queryParams?: { [key: string]: string },
): Promise<T[]> {
  limit = limit ?? MAX_RESULT_LIMIT;
  let cursor;
  let numberOfRequests = 0;
  const result: T[] = [];

  do {
    numberOfRequests++;
    const request: HttpRequest = {
      method: HttpMethod.GET,
      url: `https://slack.com/api/${url}`,
      queryParams: {
        ...queryParams,
        limit: limit.toString(),
        cursor: cursor ?? '',
      },

      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token: token,
      },
    };

    const response = await httpClient.sendRequest<BaseResponse>(request);

    if (response.body.ok === false) {
      logger.warn(`Error getting info from slack.`, {
        slackEndpoint: url,
        response: response.body,
        numberOfRequests: numberOfRequests,
      });

      throw new Error(`Error getting info from slack: ${response.body.error}`);
    }

    result.push(...action(response.body));

    if (limit && result.length >= limit) {
      break;
    }

    cursor = response.body.response_metadata.next_cursor;
  } while (cursor !== '');

  logger.info(
    `Slack data retrieved successfully. Number of requests: ${numberOfRequests}`,
    {
      slackEndpoint: url,
      responseSize: result.length,
      numberOfRequests: numberOfRequests,
    },
  );

  return result;
}

type BaseResponse = {
  ok: boolean;
  error: string;
  response_metadata: {
    next_cursor: string;
  };
};

async function makeSingleRequest(
  token: string,
  url: string,
  queryParams: QueryParams | undefined,
): Promise<BaseResponse> {
  const request: HttpRequest = {
    method: HttpMethod.GET,
    url: `https://slack.com/api/${url}`,
    queryParams,
    authentication: {
      type: AuthenticationType.BEARER_TOKEN,
      token: token,
    },
  };

  const response = await httpClient.sendRequest<BaseResponse>(request);

  if (response.body.ok === false) {
    throw new Error(`Error getting info from slack: ${response.body.error}`);
  }

  return response.body;
}
