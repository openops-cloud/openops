import {
  AppConnection,
  AppConnectionStatus,
  AppConnectionType,
  BasicAuthConnectionValue,
  CloudOAuth2ConnectionValue,
  OAuth2ConnectionValueWithApp,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import {
  ConnectionExpiredError,
  ConnectionLoadingError,
  ConnectionNotFoundError,
  ExecutionError,
  FetchError,
} from '../helper/execution-errors';

export const createConnectionService = ({
  projectId,
  engineToken,
  apiUrl,
}: CreateConnectionServiceParams): ConnectionService => {
  return {
    async obtain(connectionName: string): Promise<ConnectionValue> {
      const url = `${apiUrl}v1/worker/app-connections/${encodeURIComponent(
        connectionName,
      )}?projectId=${projectId}`;

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${engineToken}`,
          },
        });

        if (!response.ok) {
          return handleResponseError({
            connectionName,
            httpStatus: response.status,
          });
        }
        const connection: AppConnection = await response.json();
        if (connection.status === AppConnectionStatus.ERROR) {
          throw new ConnectionExpiredError(connectionName);
        }
        return getConnectionValue(connection);
      } catch (e) {
        if (e instanceof ExecutionError) {
          throw e;
        }

        return handleFetchError({
          url,
          cause: e,
        });
      }
    },
  };
};

const handleResponseError = ({
  connectionName,
  httpStatus,
}: HandleResponseErrorParams): never => {
  if (httpStatus === StatusCodes.NOT_FOUND.valueOf()) {
    throw new ConnectionNotFoundError(connectionName);
  }

  throw new ConnectionLoadingError(connectionName);
};

const handleFetchError = ({ url, cause }: HandleFetchErrorParams): never => {
  throw new FetchError(url, cause);
};

const getConnectionValue = (connection: AppConnection): ConnectionValue => {
  switch (connection.value.type) {
    case AppConnectionType.SECRET_TEXT:
      return connection.value.secret_text;

    case AppConnectionType.CUSTOM_AUTH:
      return connection.value.props;

    default:
      return connection.value;
  }
};

type ConnectionValue =
  | OAuth2ConnectionValueWithApp
  | CloudOAuth2ConnectionValue
  | BasicAuthConnectionValue
  | Record<string, unknown>
  | string;

type ConnectionService = {
  obtain(connectionName: string): Promise<ConnectionValue>;
};

type CreateConnectionServiceParams = {
  projectId: string;
  apiUrl: string;
  engineToken: string;
};

type HandleResponseErrorParams = {
  connectionName: string;
  httpStatus: number;
};

type HandleFetchErrorParams = {
  url: string;
  cause: unknown;
};
