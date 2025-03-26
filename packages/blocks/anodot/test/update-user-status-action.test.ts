const authenticateUserWithAnodotMock = jest.fn();
const setUserStatusForRecommendationMock = jest.fn();
const getAccountApiKeyMock = jest.fn();

jest.mock('../src/lib/common/auth', () => ({
  authenticateUserWithAnodot: authenticateUserWithAnodotMock,
}));

jest.mock('../src/lib/common/recommendations', () => ({
  setUserStatusForRecommendation: setUserStatusForRecommendationMock,
}));

jest.mock('../src/lib/common/account', () => ({
  getAccountApiKey: getAccountApiKeyMock,
}));

import { DynamicPropsValue } from '@openops/blocks-framework';
import { updateUserStatusAction } from '../src/lib/update-user-status-action';

describe('updateUserStatusAction', () => {
  const tokens = {
    Authorization: 'a bearer token',
    apikey: 'an account',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    authenticateUserWithAnodotMock.mockResolvedValue(tokens);
    getAccountApiKeyMock.mockResolvedValue('account api key');
  });

  const auth = {
    authUrl: 'some url',
    apiUrl: 'some api url',
    username: 'some username',
    password: 'some password',
  };

  test('should create action with correct properties', () => {
    expect(Object.keys(updateUserStatusAction.props).length).toBe(4);
    expect(updateUserStatusAction.props).toMatchObject({
      accountId: {
        required: true,
        type: 'SHORT_TEXT',
      },
      recommendationId: {
        required: true,
        type: 'SHORT_TEXT',
      },
      userStatus: {
        required: true,
        type: 'STATIC_DROPDOWN',
      },
      actionParams: {
        required: false,
        type: 'DYNAMIC',
      },
    });
  });

  test('should return correct properties in actionParams when userStatus is "label"', async () => {
    const context = createContext({});
    const result = await updateUserStatusAction.props['actionParams'].props(
      { userStatus: 'label' } as DynamicPropsValue,
      context,
    );

    expect(result['label_add']).toMatchObject({
      displayName: 'Add Labels',
      required: false,
      type: 'LONG_TEXT',
    });
    expect(result['label_delete']).toMatchObject({
      displayName: 'Delete Labels',
      required: false,
      type: 'LONG_TEXT',
    });
  });

  test('should return correct properties in actionParams when userStatus is "exclude"', async () => {
    const context = createContext({});
    const result = await updateUserStatusAction.props['actionParams'].props(
      { userStatus: 'exclude' } as DynamicPropsValue,
      context,
    );

    expect(result['comment']).toMatchObject({
      displayName: 'Comment',
      required: true,
      type: 'LONG_TEXT',
    });
    expect(result['until']).toMatchObject({
      displayName: 'Until Date',
      required: false,
      type: 'LONG_TEXT',
    });
  });

  test('should set user status for recommendation', async () => {
    setUserStatusForRecommendationMock.mockResolvedValue('mock result');
    const context = createContext({
      accountId: '123456789',
      recommendationId: '1',
      userStatus: 'done',
    });

    const result = (await updateUserStatusAction.run(context)) as any;

    expect(result).toBe('mock result');
    expect(setUserStatusForRecommendationMock).toHaveBeenCalledTimes(1);
    expect(setUserStatusForRecommendationMock).toHaveBeenCalledWith(
      'some api url',
      'a bearer token',
      'account api key',
      '1',
      'done',
      {},
    );
    expect(getAccountApiKeyMock).toHaveBeenCalledTimes(1);
    expect(getAccountApiKeyMock).toHaveBeenCalledWith(
      '123456789',
      'some api url',
      tokens,
    );
  });

  test('should set user status with actionParams if userStatus is "exclude"', async () => {
    setUserStatusForRecommendationMock.mockResolvedValue('mock result');
    const context = createContext({
      accountId: '123456789',
      recommendationId: '1',
      userStatus: 'exclude',
      actionParams: { comment: 'some comment', until: 'some date' },
    });

    const result = (await updateUserStatusAction.run(context)) as any;

    expect(result).toBe('mock result');
    expect(setUserStatusForRecommendationMock).toHaveBeenCalledTimes(1);
    expect(setUserStatusForRecommendationMock).toHaveBeenCalledWith(
      'some api url',
      'a bearer token',
      'account api key',
      '1',
      'exclude',
      {
        data: {
          comment: 'some comment',
          until: 'some date',
        },
      },
    );
  });

  test('should set user status with actionParams if userStatus is "label"', async () => {
    setUserStatusForRecommendationMock.mockResolvedValue('mock result');
    const context = createContext({
      accountId: '123456789',
      recommendationId: '1',
      userStatus: 'label',
      actionParams: { label_add: 'label add', label_delete: 'label delete' },
    });

    const result = (await updateUserStatusAction.run(context)) as any;

    expect(result).toBe('mock result');
    expect(setUserStatusForRecommendationMock).toHaveBeenCalledTimes(1);
    expect(setUserStatusForRecommendationMock).toHaveBeenCalledWith(
      'some api url',
      'a bearer token',
      'account api key',
      '1',
      'label',
      {
        data: {
          label_add: 'label add',
          label_delete: 'label delete',
        },
      },
    );
  });

  test('should throw if both lable_add not label_delete are empty', async () => {
    setUserStatusForRecommendationMock.mockResolvedValue('mock result');
    const context = createContext({
      divisionId: '1',
      accountKey: '123',
      recommendationId: '1',
      userStatus: 'label',
      actionParams: { label_add: '', label_delete: '' },
    });

    await expect(updateUserStatusAction.run(context)).rejects.toThrow(
      "An error occurred while setting user status 'label' on Anodot recommendation '1' (account id: undefined): Error: At least one of: label_add or label_delete fields must be filled.",
    );

    expect(setUserStatusForRecommendationMock).not.toHaveBeenCalled();
  });

  function createContext(props: unknown) {
    return {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: props,
    };
  }
});
