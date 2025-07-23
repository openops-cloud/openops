const makeRequestMock = {
  makeRequest: jest.fn(),
};

jest.mock('../../src/lib/common/make-request', () => makeRequestMock);

import { getReportAction } from '../../src/lib/actions/get-report-action';

describe('getReportAction', () => {
  test('should create action with correct properties', () => {
    expect(getReportAction.props).toMatchObject({
      recommendationId: {
        required: true,
        type: 'SHORT_TEXT',
      },
    });
  });

  test('should call makeRequest with correct endpoint', async () => {
    makeRequestMock.makeRequest.mockResolvedValue('mockResult');

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      propsValue: {
        recommendationId: 'some recommendationId',
      },
      auth: {
        apiUrl: 'https://api.cloudfix.com',
        apiKey: 'test-api-key',
      },
    };

    const result = await getReportAction.run(context);

    expect(result).toBe('mockResult');
    expect(makeRequestMock.makeRequest).toHaveBeenCalledWith({
      endpoint:
        '/recommendations/report?recommendationId=some recommendationId',
      method: 'GET',
      auth: context.auth,
    });
  });
});
