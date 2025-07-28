const makeRequestMock = {
  makeRequest: jest.fn(),
};

jest.mock('../../src/lib/common/make-request', () => makeRequestMock);

import { getRecommendationsAction } from '../../src/lib/actions/get-recommendations-action';

describe('getRecommendationsAction', () => {
  test('should create action with correct properties', () => {
    expect(getRecommendationsAction.props).toMatchObject({
      finderFixerId: {
        required: false,
        type: 'SHORT_TEXT',
      },
      pageNumber: {
        required: false,
        type: 'NUMBER',
      },
      pageLimit: {
        required: false,
        type: 'NUMBER',
      },
      sortBy: {
        required: false,
        type: 'STATIC_DROPDOWN',
      },
      sortOrder: {
        required: false,
        type: 'STATIC_DROPDOWN',
      },
      includeParameters: {
        required: false,
        type: 'CHECKBOX',
      },
      status: {
        required: false,
        type: 'STATIC_MULTI_SELECT_DROPDOWN',
      },
    });
  });

  test('should call makeRequest with correct endpoint', async () => {
    makeRequestMock.makeRequest.mockResolvedValue('mockResult');
    const auth = {
      apiUrl: 'https://api.cloudfix.com',
      apiKey: 'test-api-key',
    };

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth,
      propsValue: {
        finderFixerId: 'some finderFixerId',
        pageNumber: 1,
        pageLimit: 10,
        sortBy: 'some sortBy',
        sortOrder: 'some sortOrder',
        includeParameters: true,
        status: ['some status', 'some status 2'],
      },
    };

    const result = await getRecommendationsAction.run(context);

    expect(result).toBe('mockResult');
    expect(makeRequestMock.makeRequest).toHaveBeenCalledWith({
      endpoint: '/recommendations',
      method: 'GET',
      auth,
      queryParams: {
        finderFixerId: 'some finderFixerId',
        pageNumber: 1,
        pageLimit: 10,
        sortBy: 'some sortBy',
        sortOrder: 'some sortOrder',
        includeParameters: true,
        status: ['some status', 'some status 2'],
      },
    });
  });
});
