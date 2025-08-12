const makeRequestMock = {
  makeRequest: jest.fn(),
};

jest.mock('../../src/lib/common/make-request', () => makeRequestMock);

import { postponeRecommendationsAction } from '../../src/lib/actions/postpone-recommendations-action';

describe('postponeRecommendationsAction', () => {
  test('should create action with correct properties', () => {
    expect(postponeRecommendationsAction.props).toMatchObject({
      recommendationIds: {
        required: true,
        type: 'ARRAY',
      },
      postponeUntil: {
        required: true,
        type: 'DATE_TIME',
      },
      reason: {
        required: false,
        type: 'SHORT_TEXT',
      },
    });
  });

  test('should call makeRequest with correct endpoint', async () => {
    makeRequestMock.makeRequest.mockResolvedValue('mockResult');

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      propsValue: {
        recommendationIds: ['some recommendationId'],
        postponeUntil: '2024-12-31T23:59:59.000Z',
        reason: 'some reason',
      },
      auth: {
        apiUrl: 'https://api.cloudfix.com',
        apiKey: 'test-api-key',
      },
    };

    const result = await postponeRecommendationsAction.run(context);

    expect(result).toBe('mockResult');
    expect(makeRequestMock.makeRequest).toHaveBeenCalledWith({
      endpoint: '/recommendations/postpone',
      method: 'POST',
      auth: context.auth,
      body: {
        recommendationIds: ['some recommendationId'],
        postponeUntil: 1735689599000,
        reason: 'some reason',
      },
    });
  });
});
