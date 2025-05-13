/* eslint-disable @typescript-eslint/no-explicit-any */
import { BlockAuthProperty, PropertyType } from '@openops/blocks-framework';
import {
  AppConnection,
  AppConnectionType,
  AppConnectionValue,
  AppConnectionWithoutSensitiveData,
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
  value: AppConnectionValue,
): Record<string, any> | undefined {
  if (!value) {
    return undefined;
  }

  const redacted: Record<string, any> | undefined = { ...value };

  switch (auth?.type) {
    case PropertyType.SECRET_TEXT: {
      return {
        ...redacted,
        secret_text: REDACTED_MESSAGE,
      };
    }

    case PropertyType.BASIC_AUTH: {
      return {
        ...redacted,
        password: REDACTED_MESSAGE,
      };
    }

    case PropertyType.CUSTOM_AUTH: {
      if (redacted.props) {
        const props = redacted.props;
        for (const [key, prop] of Object.entries(auth.props)) {
          if (
            (prop as { type: PropertyType }).type === PropertyType.SECRET_TEXT
          ) {
            props[key] = REDACTED_MESSAGE;
          }
        }
        redacted.props = props;
      }
      return redacted;
    }

    case PropertyType.OAUTH2: {
      if (
        typeof redacted.client_secret === 'string' &&
        typeof redacted.client_id === 'string' &&
        typeof redacted.redirect_url === 'string'
      ) {
        return {
          type: AppConnectionType.OAUTH2,
          client_id: redacted.client_id,
          client_secret: REDACTED_MESSAGE,
          redirect_url: redacted.redirect_url,
        };
      }

      return undefined;
    }

    default: {
      return undefined;
    }
  }
}
