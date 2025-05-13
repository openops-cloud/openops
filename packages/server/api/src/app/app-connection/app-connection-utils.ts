/* eslint-disable @typescript-eslint/no-explicit-any */
import { BlockAuthProperty, PropertyType } from '@openops/blocks-framework';
import {
  AppConnection,
  AppConnectionType,
  AppConnectionWithoutSensitiveData,
  RedactedAppConnection,
} from '@openops/shared';

const REDACTED_MESSAGE = '**REDACTED**';

export const removeSensitiveData = (
  appConnection: AppConnection,
): AppConnectionWithoutSensitiveData => {
  const { value: _, ...appConnectionWithoutSensitiveData } = appConnection;
  return appConnectionWithoutSensitiveData as AppConnectionWithoutSensitiveData;
};

export function redactSecrets(
  auth: BlockAuthProperty | undefined,
  connection: AppConnection,
): AppConnectionWithoutSensitiveData | RedactedAppConnection {
  const value: Record<string, any> | undefined = connection.value;

  const redacted = value;

  switch (auth?.type) {
    case PropertyType.SECRET_TEXT: {
      redacted.secret_text = REDACTED_MESSAGE;
      return {
        ...connection,
        value: redacted as any,
      } as RedactedAppConnection;
    }

    case PropertyType.BASIC_AUTH: {
      redacted.password = REDACTED_MESSAGE;
      return {
        ...connection,
        value: redacted as any,
      } as RedactedAppConnection;
    }

    case PropertyType.CUSTOM_AUTH: {
      if (redacted.props) {
        const props = { ...redacted.props };
        for (const [key, prop] of Object.entries(auth.props)) {
          if (
            (prop as { type: PropertyType }).type === PropertyType.SECRET_TEXT
          ) {
            props[key] = REDACTED_MESSAGE;
          }
        }
        redacted.props = props;
      }
      return {
        ...connection,
        value: redacted as any,
      } as RedactedAppConnection;
    }

    case PropertyType.OAUTH2: {
      if (
        value?.type === AppConnectionType.OAUTH2 &&
        typeof value.client_secret === 'string' &&
        typeof value.client_id === 'string' &&
        typeof value.redirect_url === 'string'
      ) {
        return {
          ...connection,
          value: {
            type: PropertyType.OAUTH2,
            client_id: value.client_id,
            client_secret: REDACTED_MESSAGE,
            redirect_url: value.redirect_url,
          } as any,
        } as RedactedAppConnection;
      }

      return removeSensitiveData(connection);
    }

    default: {
      return removeSensitiveData(connection);
    }
  }
}

export function restoreRedactedSecrets(
  incomingConnection: AppConnection,
  existingConnection: AppConnection | undefined,
  auth: BlockAuthProperty | undefined,
): AppConnection {
  if (!auth || !existingConnection || !incomingConnection.value) {
    return incomingConnection;
  }
  const incomingValue: Record<string, any> | undefined =
    incomingConnection.value;
  const existingValue: Record<string, any> | undefined =
    existingConnection.value;

  switch (auth.type) {
    case PropertyType.SECRET_TEXT: {
      if (incomingValue.secret_text === REDACTED_MESSAGE) {
        incomingValue.secret_text = existingValue.secret_text;
      }
      break;
    }

    case PropertyType.BASIC_AUTH: {
      if (incomingValue.password === REDACTED_MESSAGE) {
        incomingValue.password = existingValue.password;
      }
      break;
    }

    case PropertyType.CUSTOM_AUTH: {
      if (incomingValue.props && existingValue.props) {
        const restoredProps: Record<string, unknown> = {
          ...incomingValue.props,
        };

        for (const [key, prop] of Object.entries(auth.props)) {
          const isSecret =
            (prop as { type: PropertyType }).type === PropertyType.SECRET_TEXT;
          const isRedacted = restoredProps[key] === REDACTED_MESSAGE;

          if (isSecret && isRedacted) {
            restoredProps[key] = existingValue.props[key];
          }
        }

        incomingValue.props = restoredProps;
      }
      break;
    }

    case PropertyType.OAUTH2: {
      if (incomingValue.client_secret === REDACTED_MESSAGE) {
        incomingValue.client_secret = existingValue.client_secret;
      }
      break;
    }

    default:
      break;
  }

  return incomingConnection;
}
