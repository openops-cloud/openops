const authenticateUserWithAnodotMock = jest.fn();
const getAnodotRecommendationsMock = jest.fn();

jest.mock('../src/lib/common/auth', () => ({
  authenticateUserWithAnodot: authenticateUserWithAnodotMock,
}));

jest.mock('../src/lib/common/recommendations', () => ({
  getAnodotRecommendations: getAnodotRecommendationsMock,
}));

import { getRecommendationsCustomAction } from '../src/lib/get-recommendations-action-custom';

describe('getRecommendationsCustomAction', () => {
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
    expect(Object.keys(getRecommendationsCustomAction.props).length).toBe(26);
    expect(getRecommendationsCustomAction.props).toMatchObject({
      accounts: {
        required: true,
        type: 'MULTI_SELECT_DROPDOWN',
      },
      statusFilter: {
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
      useCustomTags: {
        required: false,
        type: 'CHECKBOX',
      },
      customTags: {
        required: false,
        type: 'DYNAMIC',
      },
      useEnrichmentTags: {
        required: false,
        type: 'CHECKBOX',
      },
      enrichmentTags: {
        required: false,
        type: 'DYNAMIC',
      },
      useTypeId: {
        required: false,
        type: 'CHECKBOX',
      },
      typeId: {
        required: false,
        type: 'DYNAMIC',
      },
      useService: {
        required: false,
        type: 'CHECKBOX',
      },
      service: {
        required: false,
        type: 'DYNAMIC',
      },
      useRegion: {
        required: false,
        type: 'CHECKBOX',
      },
      region: {
        required: false,
        type: 'DYNAMIC',
      },
      useLinkedAccountId: {
        required: false,
        type: 'CHECKBOX',
      },
      linkedAccountId: {
        required: false,
        type: 'DYNAMIC',
      },
      useInstanceType: {
        required: false,
        type: 'CHECKBOX',
      },
      instanceType: {
        required: false,
        type: 'DYNAMIC',
      },
      useResourceId: {
        required: false,
        type: 'CHECKBOX',
      },
      resourceId: {
        required: false,
        type: 'DYNAMIC',
      },
      useAnnualSavings: {
        required: false,
        type: 'CHECKBOX',
      },
      annualSavingsProperty: {
        required: false,
        type: 'DYNAMIC',
      },
      categories: {
        required: false,
        type: 'STATIC_MULTI_SELECT_DROPDOWN',
      },
    });
  });

  test('should use mandatory properties', async () => {
    getAnodotRecommendationsMock.mockResolvedValue('mockResult');
    const context = createContext({
      accounts: [
        { accountId: 2, accountName: 'account1', accountKey: 2, divisionId: 7 },
      ],
      statusFilter: 'status',
      customStatus: {},
      openedRecommendations: { from: '1', to: '2' },
      closedAndDoneRecommendationsProperty: {},
    });

    const result = (await getRecommendationsCustomAction.run(context)) as any;

    expect(result).toEqual({ account1: 'mockResult' });
    expect(getAnodotRecommendationsMock).toHaveBeenCalledTimes(1);
    expect(getAnodotRecommendationsMock).toHaveBeenCalledWith(
      'some api url',
      'a bearer token',
      'an account:2:7',
      {
        open_recs_creation_date: { from: '1', to: '2' },
        status_filter: 'status',
      },
    );
  });

  test('should build filter with properties', async () => {
    getAnodotRecommendationsMock.mockResolvedValue('mockResult');
    const context = createContext({
      accounts: [
        { accountId: 2, accountName: 'account1', accountKey: 2, divisionId: 7 },
      ],
      statusFilter: 'status',
      customStatus: { isOpen: true, done: false, excluded: true },
      openedRecommendations: { from: '1', to: '2' },
      closedAndDoneRecommendationsProperty: {
        lastUpdateDateFrom: 'last update date from',
        lastUpdateDateTo: 'last update date to',
        creationDateFrom: 'creation date from',
        creationDateTo: 'creation date to',
        operator: 'operator',
      },
      region: { negate: true, eq: 'region' },
      typeId: { negate: true, eq: 'type id' },
      service: { negate: true, eq: 'service' },
      resourceId: { negate: true, eq: 'resource id' },
      instanceType: { negate: false, eq: 'instance type' },
      linkedAccountId: { negate: true, eq: 'linked account id' },
      customTags: {
        tag: 'custom tag',
        operator: 'an operator',
        negate: true,
        eq: 'custom tags',
        like: 'like',
      },
      enrichmentTags: {
        tag: 'enrich tag',
        operator: 'an operator',
        negate: false,
        eq: 'enrichment tags',
        like: 'like',
      },
      virtualTag: { uuid: 'uuid', eq: 'eq', like: 'like' },
      categories: [1],
      annualSavingsProperty: { annualSavingsMin: 1 },
    });

    const result = (await getRecommendationsCustomAction.run(context)) as any;

    expect(result).toEqual({ account1: 'mockResult' });
    expect(getAnodotRecommendationsMock).toHaveBeenCalledTimes(1);
    expect(getAnodotRecommendationsMock).toHaveBeenCalledWith(
      'some api url',
      'a bearer token',
      'an account:2:7',
      {
        is_open: true,
        open_recs_creation_date: { from: '1', to: '2' },
        status_filter: 'status',
        user_status: { done: false, excluded: true },
        region: { negate: true, eq: 'region' },
        type_id: { negate: true, eq: 'type id' },
        service: { negate: true, eq: 'service' },
        resource_id: { negate: true, eq: 'resource id' },
        instance_type: { negate: false, eq: 'instance type' },
        linked_account_id: { negate: true, eq: 'linked account id' },
        custom_tags: {
          negate: true,
          condition: [
            {
              tag: 'custom tag',
              eq: 'custom tags',
              operator: 'an operator',
              like: 'like',
            },
          ],
        },
        enrichment_tags: {
          negate: false,
          condition: [
            {
              tag: 'enrich tag',
              eq: 'enrichment tags',
              operator: 'an operator',
              like: 'like',
            },
          ],
        },
        virtual_tag: { uuid: 'uuid', eq: 'eq', like: 'like' },
        cat_id: [1],
        annual_savings_greater_than: 1,
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
        { accountId: 2, accountName: 'account1', accountKey: 2, divisionId: 7 },
        { accountId: 3, accountName: 'account2', accountKey: 3, divisionId: 8 },
        { accountId: 4, accountName: 'account3', accountKey: 4, divisionId: 9 },
      ],
      statusFilter: 'status',
      customStatus: {},
      openedRecommendations: { from: '1', to: '2' },
      closedAndDoneRecommendationsProperty: {},
    });

    const result = (await getRecommendationsCustomAction.run(context)) as any;

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
        status_filter: 'status',
      },
    );
    expect(getAnodotRecommendationsMock).toHaveBeenNthCalledWith(
      2,
      'some api url',
      'a bearer token',
      'an account:3:8',
      {
        open_recs_creation_date: { from: '1', to: '2' },
        status_filter: 'status',
      },
    );
    expect(getAnodotRecommendationsMock).toHaveBeenNthCalledWith(
      3,
      'some api url',
      'a bearer token',
      'an account:4:9',
      {
        open_recs_creation_date: { from: '1', to: '2' },
        status_filter: 'status',
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
