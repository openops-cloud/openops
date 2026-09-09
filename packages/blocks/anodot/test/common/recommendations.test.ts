const createAnodotAuthHeadersMock = jest.fn();
jest.mock('../../src/lib/common/anodot-requests-helpers', () => {
  return { createAnodotAuthHeaders: createAnodotAuthHeadersMock };
});

const makeHttpRequestMock = jest.fn();
jest.mock('@openops/common', () => {
  return { makeHttpRequest: makeHttpRequestMock };
});

import {
  getAnodotRecommendations,
  PaginationToken,
  setUserStatusForRecommendation,
} from '../../src/lib/common/recommendations';
import { RecommendationsRequestFilters } from '../../src/lib/common/recommendations-request-filters';

describe('getAnodotRecommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const filters: RecommendationsRequestFilters = {
    status_filter: 'opened',
    open_recs_creation_date: {
      from: '',
      to: '',
    },
  };

  test('should get recommendation', async () => {
    createAnodotAuthHeadersMock.mockReturnValue('axios header');
    makeHttpRequestMock.mockResolvedValue({
      page: ['some info'],
      isLastPage: true,
    });

    const result = await getAnodotRecommendations(
      'apiUrl',
      'authToken',
      'accountApiKey',
      filters,
    );

    expect(result).toEqual(['some info']);
    expect(makeHttpRequestMock).toHaveBeenCalledTimes(1);
    expect(makeHttpRequestMock).toHaveBeenCalledWith(
      'POST',
      'apiUrl/v2/recommendations/list',
      'axios header',
      {
        filters,
        page_size: 500,
        sort: [{ by: 'savings', order: 'desc' }],
      },
    );
    expect(createAnodotAuthHeadersMock).toHaveBeenCalledTimes(1);
    expect(createAnodotAuthHeadersMock).toHaveBeenCalledWith(
      'authToken',
      'accountApiKey',
    );
  });

  test('should throw if something fails', async () => {
    createAnodotAuthHeadersMock.mockImplementation(() => {
      throw new Error('some error');
    });

    await expect(
      getAnodotRecommendations('apiUrl', 'authToken', 'accountApiKey', filters),
    ).rejects.toThrow('some error');

    expect(makeHttpRequestMock).not.toHaveBeenCalled();
    expect(createAnodotAuthHeadersMock).toHaveBeenCalledTimes(1);
    expect(createAnodotAuthHeadersMock).toHaveBeenCalledWith(
      'authToken',
      'accountApiKey',
    );
  });

  test('should paginate', async () => {
    createAnodotAuthHeadersMock.mockReturnValue('axios header');
    makeHttpRequestMock
      .mockResolvedValueOnce({
        page: ['some recommendation 1'],
        isLastPage: false,
        paginationToken: { recId: 1, createdAt: '' } as PaginationToken,
      })
      .mockResolvedValueOnce({
        page: ['some recommendation 2', 'some recommendation 3'],
        isLastPage: false,
        paginationToken: { recId: 2, createdAt: '' } as PaginationToken,
      })
      .mockResolvedValueOnce({
        page: ['some recommendation 4'],
        isLastPage: true,
      });

    const result = await getAnodotRecommendations(
      'apiUrl',
      'authToken',
      'accountApiKey',
      filters,
    );

    expect(result).toEqual([
      'some recommendation 1',
      'some recommendation 2',
      'some recommendation 3',
      'some recommendation 4',
    ]);
    expect(makeHttpRequestMock).toHaveBeenCalledTimes(3);
    expect(makeHttpRequestMock).toHaveBeenNthCalledWith(
      1,
      'POST',
      'apiUrl/v2/recommendations/list',
      'axios header',
      {
        filters,
        page_size: 500,
        sort: [{ by: 'savings', order: 'desc' }],
      },
    );
    expect(makeHttpRequestMock).toHaveBeenNthCalledWith(
      2,
      'POST',
      'apiUrl/v2/recommendations/list',
      'axios header',
      {
        filters,
        page_size: 500,
        pagination_token: { recId: 1, createdAt: '' },
        sort: [{ by: 'savings', order: 'desc' }],
      },
    );
    expect(makeHttpRequestMock).toHaveBeenNthCalledWith(
      3,
      'POST',
      'apiUrl/v2/recommendations/list',
      'axios header',
      {
        filters,
        page_size: 500,
        pagination_token: { recId: 2, createdAt: '' },
        sort: [{ by: 'savings', order: 'desc' }],
      },
    );
    expect(createAnodotAuthHeadersMock).toHaveBeenCalledTimes(1);
    expect(createAnodotAuthHeadersMock).toHaveBeenCalledWith(
      'authToken',
      'accountApiKey',
    );
  });
});

describe('setUserStatusForRecommendation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should set user status', async () => {
    createAnodotAuthHeadersMock.mockReturnValue('axios header');
    makeHttpRequestMock.mockResolvedValue('mock result');

    const result = await setUserStatusForRecommendation(
      'apiUrl',
      'authToken',
      'accountApiKey',
      '1',
      'done',
      {
        data: {
          label_add: 'label add',
          label_delete: 'label delete',
        },
      },
    );

    expect(result).toEqual('mock result');
    expect(makeHttpRequestMock).toHaveBeenCalledTimes(1);
    expect(makeHttpRequestMock).toHaveBeenCalledWith(
      'POST',
      'apiUrl/v2/recommendations/user-action',
      'axios header',
      {
        action: 'done',
        recId: '1',
        actionParams: {
          data: {
            label_add: 'label add',
            label_delete: 'label delete',
          },
        },
      },
    );
    expect(createAnodotAuthHeadersMock).toHaveBeenCalledTimes(1);
    expect(createAnodotAuthHeadersMock).toHaveBeenCalledWith(
      'authToken',
      'accountApiKey',
    );
  });

  test('should throw if something fails', async () => {
    createAnodotAuthHeadersMock.mockImplementation(() => {
      throw new Error('some error');
    });

    await expect(
      setUserStatusForRecommendation(
        'apiUrl',
        'authToken',
        'accountApiKey',
        '1',
        'done',
        {},
      ),
    ).rejects.toThrow('some error');

    expect(makeHttpRequestMock).not.toHaveBeenCalled();
    expect(createAnodotAuthHeadersMock).toHaveBeenCalledTimes(1);
    expect(createAnodotAuthHeadersMock).toHaveBeenCalledWith(
      'authToken',
      'accountApiKey',
    );
  });
});
