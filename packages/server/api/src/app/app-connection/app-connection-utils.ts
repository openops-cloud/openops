/* eslint-disable @typescript-eslint/no-explicit-any */
import { BlockAuthProperty, PropertyType } from '@openops/blocks-framework';
import {
  AppConnection,
  AppConnectionWithoutSensitiveData,
  RedactedAppConnection,
} from '@openops/shared';

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
  if (!auth || !value) {
    return removeSensitiveData(connection);
  }

  const redacted = { ...value };

  switch (auth.type) {
    case PropertyType.SECRET_TEXT: {
      redacted.secret_text = '**REDACTED**';
      return {
        ...connection,
        value: redacted as any,
      };
    }

    case PropertyType.BASIC_AUTH: {
      redacted.password = '**REDACTED**';
      return {
        ...connection,
        value: redacted as any,
      };
    }

    case PropertyType.CUSTOM_AUTH: {
      if (redacted.props) {
        const props = { ...redacted.props };
        for (const [key, prop] of Object.entries(auth.props)) {
          if (
            (prop as { type: PropertyType }).type === PropertyType.SECRET_TEXT
          ) {
            props[key] = '**REDACTED**';
          }
        }
        redacted.props = props;
      }
      return {
        ...connection,
        value: redacted as any,
      };
    }

    case PropertyType.OAUTH2: {
      if ('client_secret' in connection.value) {
        return {
          ...connection,
          value: {
            type: PropertyType.OAUTH2,
            client_id: value.client_id,
            client_secret: '**REDACTED**',
            redirect_url: value.redirect_url,
          } as any,
        };
      }

      return removeSensitiveData(connection);
    }

    default: {
      return removeSensitiveData(connection);
    }
  }
}
