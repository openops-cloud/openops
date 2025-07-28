const makeRequestMock = {
  makeRequest: jest.fn(),
};

jest.mock('../../src/lib/common/make-request', () => makeRequestMock);

import { createChangeRequestsAction } from '../../src/lib/actions/create-change-requests-action';

describe('createChangeRequestsAction', () => {
  test('should create action with correct properties', () => {
    expect(createChangeRequestsAction.props).toMatchObject({
      recommendationIds: {
        required: true,
        type: 'ARRAY',
      },
      executeOnSchedule: {
        required: false,
        type: 'CHECKBOX',
      },
    });
  });

  test('should call makeRequest with correct endpoint', async () => {
    makeRequestMock.makeRequest.mockResolvedValue('mockResult');

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: {
        apiUrl: 'https://api.cloudfix.com',
        apiKey: 'test-api-key',
      },
      propsValue: {
        recommendationIds: ['some recommendationId'],
        executeOnSchedule: true,
      },
    };

    const result = await createChangeRequestsAction.run(context);

    expect(result).toBe('mockResult');
    expect(makeRequestMock.makeRequest).toHaveBeenCalledWith({
      endpoint: '/create-change-requests',
      method: 'POST',
      auth: context.auth,
      body: {
        recommendationIds: ['some recommendationId'],
        executeOnSchedule: true,
      },
    });
  });
});
