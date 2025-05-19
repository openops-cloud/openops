/* eslint-disable @typescript-eslint/no-explicit-any */
import { BlockAuthProperty, PropertyType } from '@openops/blocks-framework';
import {
  AppConnection,
  AppConnectionStatus,
  AppConnectionType,
} from '@openops/shared';
import { redactSecrets } from '../../../src/app/app-connection/app-connection-utils';

describe('redactSecrets', () => {
  const baseConnection: Omit<AppConnection, 'value' | 'type'> = {
    id: 'conn1',
    created: '2025-05-02T00:00:00Z',
    updated: '2025-05-02T00:00:00Z',
    name: 'Test',
    blockName: 'block-test',
    projectId: 'project-1',
    status: AppConnectionStatus.ACTIVE,
  };

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
      type: PropertyType.SECRET_TEXT,
      displayName: 'Secret',
      valueSchema: 'some schema',
      required: true,
    };

    const result = redactSecrets(auth, connection.value);
    expect(result?.secret_text).toBe('**REDACTED**');
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
    expect(result?.password).toBe('**REDACTED**');
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

    expect(props.clientSecret).toBe('**REDACTED**');
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
      client_secret: '**REDACTED**',
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
        type: PropertyType.SECRET_TEXT,
        displayName: 'x',
        valueSchema: {} as any,
        required: true,
      },
      connection.value,
    );
    expect(result).toEqual(undefined);
  });
});
