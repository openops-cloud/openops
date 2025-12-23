/* eslint-disable @typescript-eslint/no-explicit-any */
import { BlockAuthProperty, PropertyType } from '@openops/blocks-framework';
import {
  AppConnection,
  AppConnectionStatus,
  AppConnectionType,
} from '@openops/shared';
import {
  redactSecrets,
  restoreRedactedSecrets,
} from '../../../src/app/app-connection/app-connection-utils';

const REDACTED_MESSAGE = '**REDACTED**';

describe('redactSecrets', () => {
  const baseConnection: Omit<AppConnection, 'value' | 'type'> = {
    id: 'conn1',
    created: '2025-05-02T00:00:00Z',
    updated: '2025-05-02T00:00:00Z',
    name: 'Test',
    projectId: 'project-1',
    status: AppConnectionStatus.ACTIVE,
    authProviderKey: 'auth-provider-1',
  };

  const falsyValues = [
    { value: null, description: 'null' },
    { value: undefined, description: 'undefined' },
    { value: '', description: 'empty string' },
  ];

  test('should return redacted SECRET_TEXT connection', () => {
    const connection: AppConnection = {
      ...baseConnection,
      type: AppConnectionType.SECRET_TEXT,
      value: {
        type: AppConnectionType.SECRET_TEXT,
        secret_text: 'super-secret',
      },
    };

    const auth: BlockAuthProperty = {
      authProviderKey: 'AWS',
      authProviderDisplayName: 'AWS',
      authProviderLogoUrl: `/blocks/aws.png`,
      type: PropertyType.SECRET_TEXT,
      displayName: 'Secret',
      valueSchema: 'some schema',
      required: true,
    };

    const result = redactSecrets(auth, connection.value);
    expect(result?.secret_text).toBe(REDACTED_MESSAGE);
  });

  test('should return BASIC_AUTH connection', () => {
    const connection: AppConnection = {
      ...baseConnection,
      type: AppConnectionType.BASIC_AUTH,
      value: {
        type: AppConnectionType.BASIC_AUTH,
        username: 'user',
        password: 'secret',
      },
    };

    const auth = {
      type: PropertyType.BASIC_AUTH,
      displayName: 'Basic Auth',
      username: { displayName: 'Username' },
      password: { displayName: 'Password' },
      valueSchema: {} as any,
    } as any;

    const result = redactSecrets(auth, connection.value);
    expect(result?.password).toBe(REDACTED_MESSAGE);
    expect(result?.username).toBe('user');
  });

  test('should return redacted CUSTOM_AUTH props', () => {
    const connection: AppConnection = {
      ...baseConnection,
      type: AppConnectionType.CUSTOM_AUTH,
      value: {
        type: AppConnectionType.CUSTOM_AUTH,
        props: {
          clientId: 'abc',
          clientSecret: 'very-secret',
          nonSecret: 'keep-this',
        },
      },
    };

    const auth: BlockAuthProperty = {
      authProviderKey: 'AWS',
      authProviderDisplayName: 'AWS',
      authProviderLogoUrl: `/blocks/aws.png`,
      type: PropertyType.CUSTOM_AUTH,
      displayName: 'Custom Auth',
      props: {
        clientId: { type: PropertyType.SHORT_TEXT, displayName: 'Client ID' },
        clientSecret: {
          type: PropertyType.SECRET_TEXT,
          displayName: 'Client Secret',
        },
        nonSecret: { type: PropertyType.SHORT_TEXT, displayName: 'Other' },
      },
      valueSchema: {} as any,
      required: false,
    };

    const result = redactSecrets(auth, connection.value);
    const props = result?.props as Record<string, any>;

    expect(props.clientSecret).toBe(REDACTED_MESSAGE);
    expect(props.clientId).toBe('abc');
  });

  test('should return redacted OAuth2 user-supplied client_secret only', () => {
    const connection: AppConnection = {
      ...baseConnection,
      type: AppConnectionType.OAUTH2,
      value: {
        type: AppConnectionType.OAUTH2,
        client_id: 'abc',
        client_secret: 'should-hide',
        redirect_url: 'https://redirect.com',
        token_type: 'bearer',
        access_token: 'secret',
        refresh_token: 'refresh',
        scope: 'openid',
        claimed_at: 123456,
        token_url: 'https://token.com',
        data: {},
      },
    };

    const auth: BlockAuthProperty = {
      authProviderKey: 'AWS',
      authProviderDisplayName: 'AWS',
      authProviderLogoUrl: `/blocks/aws.png`,
      type: PropertyType.OAUTH2,
      displayName: 'OAuth2',
      authUrl: '',
      tokenUrl: '',
      scope: [],
      valueSchema: {} as any,
      required: true,
    };

    const result = redactSecrets(auth, connection.value);

    expect(result).toEqual({
      type: PropertyType.OAUTH2,
      client_id: 'abc',
      client_secret: REDACTED_MESSAGE,
      redirect_url: 'https://redirect.com',
    });
  });

  test('should fall to removeSensitiveData when auth is undefined', () => {
    const connection: AppConnection = {
      ...baseConnection,
      type: AppConnectionType.BASIC_AUTH,
      value: {
        type: AppConnectionType.BASIC_AUTH,
        username: 'user',
        password: 'secret',
      },
    };

    const result = redactSecrets(undefined, connection.value);
    expect(result).toEqual(undefined);
  });

  test('should fall back to removeSensitiveData when value is missing', () => {
    const connection = {
      ...baseConnection,
      type: AppConnectionType.SECRET_TEXT,
      value: undefined as any,
    };

    const result = redactSecrets(
      {
        authProviderKey: 'AWS',
        authProviderDisplayName: 'AWS',
        authProviderLogoUrl: `/blocks/aws.png`,
        type: PropertyType.SECRET_TEXT,
        displayName: 'x',
        valueSchema: {} as any,
        required: true,
      },
      connection.value,
    );
    expect(result).toEqual(undefined);
  });

  test.each(falsyValues)(
    'should return original value when SECRET_TEXT is $description',
    ({ value }) => {
      const connection: AppConnection = {
        ...baseConnection,
        type: AppConnectionType.SECRET_TEXT,
        value: {
          type: AppConnectionType.SECRET_TEXT,
          secret_text: value as any,
        },
      };

      const auth: BlockAuthProperty = {
        authProviderKey: 'AWS',
        authProviderDisplayName: 'AWS',
        authProviderLogoUrl: `/blocks/aws.png`,
        type: PropertyType.SECRET_TEXT,
        displayName: 'Secret',
        valueSchema: 'some schema',
        required: true,
      };

      const result = redactSecrets(auth, connection.value);
      expect(result?.secret_text).toBe(value);
    },
  );

  test.each(falsyValues)(
    'should return original value when BASIC_AUTH password is $description',
    ({ value }) => {
      const connection: AppConnection = {
        ...baseConnection,
        type: AppConnectionType.BASIC_AUTH,
        value: {
          type: AppConnectionType.BASIC_AUTH,
          username: 'user',
          password: value as any,
        },
      };

      const auth = {
        type: PropertyType.BASIC_AUTH,
        displayName: 'Basic Auth',
        username: { displayName: 'Username' },
        password: { displayName: 'Password' },
        valueSchema: {} as any,
      } as any;

      const result = redactSecrets(auth, connection.value);
      expect(result?.password).toBe(value);
      expect(result?.username).toBe('user');
    },
  );

  test.each(falsyValues)(
    'should return original value when CUSTOM_AUTH secret prop is $description',
    ({ value }) => {
      const connection: AppConnection = {
        ...baseConnection,
        type: AppConnectionType.CUSTOM_AUTH,
        value: {
          type: AppConnectionType.CUSTOM_AUTH,
          props: {
            clientId: 'abc',
            clientSecret: value as any,
            nonSecret: 'keep-this',
          },
        },
      };

      const auth: BlockAuthProperty = {
        authProviderKey: 'AWS',
        authProviderDisplayName: 'AWS',
        authProviderLogoUrl: `/blocks/aws.png`,
        type: PropertyType.CUSTOM_AUTH,
        displayName: 'Custom Auth',
        props: {
          clientId: { type: PropertyType.SHORT_TEXT, displayName: 'Client ID' },
          clientSecret: {
            type: PropertyType.SECRET_TEXT,
            displayName: 'Client Secret',
          },
          nonSecret: { type: PropertyType.SHORT_TEXT, displayName: 'Other' },
        },
        valueSchema: {} as any,
        required: false,
      };

      const result = redactSecrets(auth, connection.value);
      const props = result?.props as Record<string, any>;

      expect(props.clientSecret).toBe(value);
      expect(props.clientId).toBe('abc');
      expect(props.nonSecret).toBe('keep-this');
    },
  );

  test.each([
    { value: null, description: 'null', expectUndefined: true },
    { value: undefined, description: 'undefined', expectUndefined: true },
    { value: '', description: 'empty string', expectUndefined: false },
  ])(
    'should handle OAUTH2 client_secret when $description',
    ({ value, expectUndefined }) => {
      const connection: AppConnection = {
        ...baseConnection,
        type: AppConnectionType.OAUTH2,
        value: {
          type: AppConnectionType.OAUTH2,
          client_id: 'abc',
          client_secret: value as any,
          redirect_url: 'https://redirect.com',
        } as any,
      };

      const auth: BlockAuthProperty = {
        authProviderKey: 'AWS',
        authProviderDisplayName: 'AWS',
        authProviderLogoUrl: `/blocks/aws.png`,
        type: PropertyType.OAUTH2,
        displayName: 'OAuth2',
        authUrl: '',
        tokenUrl: '',
        scope: [],
        valueSchema: {} as any,
        required: true,
      };

      const result = redactSecrets(auth, connection.value);

      if (expectUndefined) {
        expect(result).toBeUndefined();
      } else {
        expect(result).toEqual({
          type: PropertyType.OAUTH2,
          client_id: 'abc',
          client_secret: value,
          redirect_url: 'https://redirect.com',
        });
      }
    },
  );
});

describe('restoreRedactedSecrets', () => {
  test('should restore SECRET_TEXT when redacted', () => {
    const incoming = { secret_text: REDACTED_MESSAGE };
    const existing = { secret_text: 'original-secret' };
    const auth: BlockAuthProperty = {
      authProviderKey: 'AWS',
      authProviderDisplayName: 'AWS',
      authProviderLogoUrl: `/blocks/aws.png`,
      type: PropertyType.SECRET_TEXT,
      displayName: 'Secret',
      valueSchema: {} as any,
      required: true,
    };

    const result = restoreRedactedSecrets(incoming, existing, auth);
    expect(result.secret_text).toBe('original-secret');
  });

  test('should not restore SECRET_TEXT when not redacted', () => {
    const incoming = { secret_text: 'new-secret' };
    const existing = { secret_text: 'original-secret' };
    const auth: BlockAuthProperty = {
      authProviderKey: 'AWS',
      authProviderDisplayName: 'AWS',
      authProviderLogoUrl: `/blocks/aws.png`,
      type: PropertyType.SECRET_TEXT,
      displayName: 'Secret',
      valueSchema: {} as any,
      required: true,
    };

    const result = restoreRedactedSecrets(incoming, existing, auth);
    expect(result.secret_text).toBe('new-secret');
  });

  test('should restore BASIC_AUTH password when redacted', () => {
    const incoming = { username: 'user', password: REDACTED_MESSAGE };
    const existing = { username: 'user', password: 'original-password' };
    const auth: BlockAuthProperty = {
      type: PropertyType.BASIC_AUTH,
      displayName: 'Basic Auth',
      username: { displayName: 'User' },
      password: { displayName: 'Pass' },
      valueSchema: {} as any,
      required: true,
    } as any;

    const result = restoreRedactedSecrets(incoming, existing, auth);
    expect(result.password).toBe('original-password');
  });

  test('should restore CUSTOM_AUTH props if secret was redacted', () => {
    const incoming = {
      props: {
        clientId: 'abc',
        clientSecret: REDACTED_MESSAGE,
      },
    };
    const existing = {
      props: {
        clientId: 'abc',
        clientSecret: 'real-secret',
      },
    };
    const auth: BlockAuthProperty = {
      authProviderKey: 'AWS',
      authProviderDisplayName: 'AWS',
      authProviderLogoUrl: `/blocks/aws.png`,
      type: PropertyType.CUSTOM_AUTH,
      displayName: 'Custom',
      props: {
        clientId: { type: PropertyType.SHORT_TEXT, displayName: 'Client ID' },
        clientSecret: {
          type: PropertyType.SECRET_TEXT,
          displayName: 'Client Secret',
        },
      },
      valueSchema: {} as any,
      required: false,
    };

    const result = restoreRedactedSecrets(incoming, existing, auth);
    expect(result.props.clientSecret).toBe('real-secret');
    expect(result.props.clientId).toBe('abc');
  });

  test('should restore OAUTH2 client_secret if redacted', () => {
    const incoming = {
      client_id: 'abc',
      client_secret: REDACTED_MESSAGE,
      redirect_url: 'https://url',
    };
    const existing = {
      client_id: 'abc',
      client_secret: 'real-client-secret',
      redirect_url: 'https://url',
    };
    const auth: BlockAuthProperty = {
      authProviderKey: 'AWS',
      authProviderDisplayName: 'AWS',
      authProviderLogoUrl: `/blocks/aws.png`,
      type: PropertyType.OAUTH2,
      displayName: 'OAuth2',
      authUrl: '',
      tokenUrl: '',
      scope: [],
      valueSchema: {} as any,
      required: true,
    };

    const result = restoreRedactedSecrets(incoming, existing, auth);
    expect(result.client_secret).toBe('real-client-secret');
  });

  test('should not modify values if auth type is unsupported', () => {
    const incoming = { token: REDACTED_MESSAGE };
    const existing = { token: 'real-token' };
    const auth = {
      type: 'UNSUPPORTED_TYPE' as PropertyType,
    } as BlockAuthProperty;

    const result = restoreRedactedSecrets(incoming, existing, auth);
    expect(result).toEqual(incoming);
  });

  test('should not throw if auth is undefined', () => {
    const incoming = { someKey: REDACTED_MESSAGE };
    const existing = { someKey: 'value' };

    const result = restoreRedactedSecrets(incoming, existing, undefined);
    expect(result).toEqual(incoming);
  });
});
