const authenticateUserWithAnodotMock = jest.fn();
const getAnodotRecommendationsMock = jest.fn();

jest.mock('../src/lib/common/auth', () => ({
  authenticateUserWithAnodot: authenticateUserWithAnodotMock,
}));

jest.mock('../src/lib/common/recommendations', () => ({
  getAnodotRecommendations: getAnodotRecommendationsMock,
}));

import { getRecommendationsAction } from '../src/lib/get-recommendations-action-predefined';

describe('getRecommendationsAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authenticateUserWithAnodotMock.mockResolvedValue({
      Authorization: 'a bearer token',
      apikey: 'an account',
    });
  });

  const auth = {
    authUrl: 'some url',
    apiUrl: 'some api url',
    username: 'some username',
    password: 'some password',
  };

  test('should create action with correct properties', () => {
    expect(Object.keys(getRecommendationsAction.props).length).toBe(5);
    expect(getRecommendationsAction.props).toMatchObject({
      accounts: {
        required: true,
        type: 'MULTI_SELECT_DROPDOWN',
      },
      recommendationType: {
        required: true,
        type: 'STATIC_DROPDOWN',
      },
      customStatus: {
        required: true,
        type: 'DYNAMIC',
      },
      openedRecommendations: {
        required: true,
        type: 'DYNAMIC',
      },
      closedAndDoneRecommendations: {
        required: true,
        type: 'DYNAMIC',
      },
    });
  });

  test('should handle get recommendation', async () => {
    getAnodotRecommendationsMock.mockResolvedValue('mockResult');

    const context = createContext({
      accounts: [
        { accountKey: 'key1', divisionId: 'div1', accountName: 'account1' },
      ],
      recommendationType: {
        filters: { type_id: ['aws-backup-outdated-snapshot'] },
      },
      openedRecommendations: { from: '2021-01-01', to: '2021-12-31' },
    });

    const result = await getRecommendationsAction.run(context);

    expect(result).toEqual({ account1: 'mockResult' });
    expect(authenticateUserWithAnodotMock).toHaveBeenCalledWith(
      auth.authUrl,
      auth.username,
      auth.password,
    );
    expect(getAnodotRecommendationsMock).toHaveBeenCalledWith(
      auth.apiUrl,
      'a bearer token',
      'an account:key1:div1',
      {
        status_filter: 'potential_savings',
        open_recs_creation_date: { from: '2021-01-01', to: '2021-12-31' },
        type_id: { eq: ['aws-backup-outdated-snapshot'], negate: false },
      },
    );
  });

  test('should loop over accounts', async () => {
    getAnodotRecommendationsMock
      .mockResolvedValueOnce('mockResult1')
      .mockResolvedValueOnce('mockResult2')
      .mockResolvedValueOnce('mockResult3');
    const context = createContext({
      accounts: [
        {
          accountId: 2,
          accountName: 'account1',
          accountKey: 2,
          divisionId: 7,
        },
        {
          accountId: 3,
          accountName: 'account2',
          accountKey: 3,
          divisionId: 8,
        },
        {
          accountId: 4,
          accountName: 'account3',
          accountKey: 4,
          divisionId: 9,
        },
      ],
      recommendationType: {
        filters: { type_id: ['aws-backup-outdated-snapshot'] },
      },
      customStatus: {},
      openedRecommendations: { from: '1', to: '2' },
      closedAndDoneRecommendationsProperty: {},
    });

    const result = (await getRecommendationsAction.run(context)) as any;

    expect(result).toEqual({
      account1: 'mockResult1',
      account2: 'mockResult2',
      account3: 'mockResult3',
    });
    expect(getAnodotRecommendationsMock).toHaveBeenCalledTimes(3);
    expect(getAnodotRecommendationsMock).toHaveBeenNthCalledWith(
      1,
      'some api url',
      'a bearer token',
      'an account:2:7',
      {
        open_recs_creation_date: { from: '1', to: '2' },
        status_filter: 'potential_savings',
        type_id: { negate: false, eq: ['aws-backup-outdated-snapshot'] },
      },
    );
    expect(getAnodotRecommendationsMock).toHaveBeenNthCalledWith(
      2,
      'some api url',
      'a bearer token',
      'an account:3:8',
      {
        open_recs_creation_date: { from: '1', to: '2' },
        status_filter: 'potential_savings',
        type_id: { negate: false, eq: ['aws-backup-outdated-snapshot'] },
      },
    );
    expect(getAnodotRecommendationsMock).toHaveBeenNthCalledWith(
      3,
      'some api url',
      'a bearer token',
      'an account:4:9',
      {
        open_recs_creation_date: { from: '1', to: '2' },
        status_filter: 'potential_savings',
        type_id: { negate: false, eq: ['aws-backup-outdated-snapshot'] },
      },
    );
  });

  function createContext(props: unknown) {
    return {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: props,
    };
  }
});
