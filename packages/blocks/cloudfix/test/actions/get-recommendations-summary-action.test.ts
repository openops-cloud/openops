const makeRequestMock = {
  makeRequest: jest.fn(),
};

jest.mock('../../src/lib/common/make-request', () => makeRequestMock);

import { getRecommendationsSummaryAction } from '../../src/lib/actions/get-recommendations-summary-action';

describe('getRecommendationsSummaryAction', () => {
  test('should call makeRequest with correct endpoint', async () => {
    makeRequestMock.makeRequest.mockResolvedValue('mockResult');

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      propsValue: {},
      auth: {
        apiUrl: 'https://api.cloudfix.com',
        apiKey: 'test-api-key',
      },
    };

    const result = await getRecommendationsSummaryAction.run(context);

    expect(result).toBe('mockResult');
    expect(makeRequestMock.makeRequest).toHaveBeenCalledWith({
      endpoint: '/recommendations/summary',
      method: 'GET',
      auth: context.auth,
    });
  });
});
