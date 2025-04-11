const sendRequestMock = jest.fn();
jest.mock('@openops/blocks-common', () => ({
  ...jest.requireActual('@openops/blocks-common'),
  httpClient: { sendRequest: sendRequestMock },
}));

import {
  AuthenticationType,
  HttpError,
  HttpMethod,
} from '@openops/blocks-common';
import {
  JiraUser,
  searchUserByCriteria,
  sendJiraRequest,
} from '../../src/lib/common/index';

describe('searchUserByCriteria', () => {
  const auth = {
    instanceUrl: 'some url',
    email: 'some email',
    apiToken: 'some api token',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const emailToTest = 'test@mail.com';
  const expectedRequest = {
    url: `user/search?query=${emailToTest}`,
    method: HttpMethod.GET,
    auth: auth,
  };

  test('should throw an error when the request fails', async () => {
    sendRequestMock.mockRejectedValue(new Error('error with something'));

    await expect(() =>
      searchUserByCriteria(auth, 'test@mail.com'),
    ).rejects.toThrow('error with something');
    expect(sendRequestMock).toHaveBeenCalledTimes(1);
    expect(sendRequestMock).toHaveBeenCalledWith({
      ...expectedRequest,
      url: `${expectedRequest.auth.instanceUrl}/rest/api/3/${expectedRequest.url}`,
      authentication: {
        type: AuthenticationType.BASIC,
        username: expectedRequest.auth.email,
        password: expectedRequest.auth.apiToken,
      },
    });
  });

  const jiraUserResponse = {
    accountId: '123',
    accountType: 'accountType',
    active: true,
    displayName: 'displayName',
    emailAddress: 'emailAddress',
    locate: 'locate',
    self: 'self',
    timeZone: 'timeZone',
  };

  test.each([[[]], [[jiraUserResponse]]])(
    'should return the response=%p from Jira API',
    async (expectedResult: any) => {
      sendRequestMock.mockResolvedValue({
        status: 200,
        headers: {
          random: 'header',
        },
        body: expectedResult,
      });

      const result = await searchUserByCriteria(auth, emailToTest);

      expect(result).toEqual(expectedResult as JiraUser[]);
      expect(sendRequestMock).toHaveBeenCalledTimes(1);
      expect(sendRequestMock).toHaveBeenCalledWith({
        ...expectedRequest,
        url: `${expectedRequest.auth.instanceUrl}/rest/api/3/${expectedRequest.url}`,
        authentication: {
          type: AuthenticationType.BASIC,
          username: expectedRequest.auth.email,
          password: expectedRequest.auth.apiToken,
        },
      });
    },
  );
});

describe('sendJiraRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const auth = {
    instanceUrl: 'https://example.atlassian.net',
    email: 'email@example.com',
    apiToken: 'secret',
  };

  const baseRequest = {
    url: 'some/endpoint',
    method: HttpMethod.GET,
    auth,
  };

  test('throws Jira-specific message when screen config error is returned', async () => {
    const errorMessage = 'It is not on the appropriate screen, or unknown.';
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {
          errorMessages: [errorMessage],
        },
      },
    };

    const httpError = new HttpError(undefined, axiosError as any);
    sendRequestMock.mockImplementation(() => {
      throw httpError;
    });

    const expectedRawError = JSON.stringify(axiosError.response.data);
    const expectedMessage = `One or more fields you're trying to set is not configured on the project's create/edit screen. You need to add it in Jira's screen settings.\n\nOriginal error: ${expectedRawError}`;

    await expect(sendJiraRequest(baseRequest)).rejects.toThrow(expectedMessage);
  });

  test('throws stringified Axios error if not screen config issue', async () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {
          errorMessages: ['Some other Jira error'],
        },
      },
    };

    const httpError = new HttpError(undefined, axiosError as any);
    sendRequestMock.mockImplementation(() => {
      throw httpError;
    });

    const expectedRawError = JSON.stringify(axiosError.response.data);

    await expect(sendJiraRequest(baseRequest)).rejects.toThrow(
      expectedRawError,
    );
  });

  test('throws raw non-HttpError error', async () => {
    const nonHttpError = new Error('unexpected crash');

    sendRequestMock.mockImplementation(() => {
      throw nonHttpError;
    });

    await expect(sendJiraRequest(baseRequest)).rejects.toThrow(
      'unexpected crash',
    );
  });

  test('returns successful response if no errors', async () => {
    const mockResponse = {
      status: 200,
      body: { result: 'success' },
    };

    sendRequestMock.mockResolvedValue(mockResponse);

    const result = await sendJiraRequest(baseRequest);

    expect(result).toEqual(mockResponse);
    expect(sendRequestMock).toHaveBeenCalledWith({
      ...baseRequest,
      url: `${auth.instanceUrl}/rest/api/3/${baseRequest.url}`,
      authentication: {
        type: AuthenticationType.BASIC,
        username: auth.email,
        password: auth.apiToken,
      },
    });
  });
});
