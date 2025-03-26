const makeHttpRequestMock = jest.fn();
jest.mock('../../src/lib/axios-wrapper', () => ({
  makeHttpRequest: makeHttpRequestMock,
}));

const systemMock = {
  getBoolean: jest.fn(),
};

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  AppSystemProp: {
    OPS_ENABLE_HOST_SESSION: 'OPS_ENABLE_HOST_SESSION',
  },
  system: systemMock,
}));

import { AxiosHeaders } from 'axios';
import { authenticateUserWithAzure, azureAuth } from '../../src/lib/azure/auth';

describe('authenticateUserWithAzure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call make http request with expected parameters', async () => {
    makeHttpRequestMock.mockReturnValue('some response');

    const result = await authenticateUserWithAzure({
      tenantId: 1,
      clientId: 2,
      clientSecret: 3,
    });

    expect(makeHttpRequestMock).toHaveBeenCalledTimes(1);
    expect(makeHttpRequestMock).toHaveBeenCalledWith(
      'POST',
      'https://login.microsoftonline.com/1/oauth2/v2.0/token',
      new AxiosHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      'client_id=2&client_secret=3&grant_type=client_credentials&scope=https://management.azure.com/.default',
    );
    expect(result).toEqual('some response');
  });

  test('azureAuth should have expected properties', async () => {
    expect(azureAuth.props.clientId.displayName).toEqual(
      'Application (client) ID',
    );
    expect(azureAuth.props.clientId.description).toEqual(
      'The Azure Application (client) ID.',
    );
    expect(azureAuth.props.clientId.type).toEqual('SHORT_TEXT');

    expect(azureAuth.props.clientSecret.displayName).toEqual('Client Secret');
    expect(azureAuth.props.clientSecret.description).toEqual(
      'The secret associated with the Azure Application.',
    );
    expect(azureAuth.props.clientSecret.type).toEqual('SECRET_TEXT');

    expect(azureAuth.props.tenantId.displayName).toEqual(
      'Directory (tenant) ID',
    );
    expect(azureAuth.props.tenantId.description).toEqual(
      'The Azure Directory (tenant) ID.',
    );
    expect(azureAuth.props.tenantId.type).toEqual('SHORT_TEXT');

    expect(azureAuth.displayName).toEqual('Connection');
    expect(azureAuth.required).toBe(true);
    expect(azureAuth.type).toEqual('CUSTOM_AUTH');
  });

  test.each([
    [undefined, true],
    [true, false],
    [false, true],
  ])(
    'azureAuth should be required depending on OPS_ENABLE_HOST_SESSION=%p',
    async (hostSessionValue: boolean | undefined, result: boolean) => {
      systemMock.getBoolean.mockReturnValue(hostSessionValue);
      jest.resetModules();
      const { azureAuth: freshAzureAuth } = await import(
        '../../src/lib/azure/auth'
      );
      expect(freshAzureAuth.required).toBe(result);
    },
  );
});
