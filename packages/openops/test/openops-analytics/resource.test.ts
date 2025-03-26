const axiosMock = {
  ...jest.requireActual('axios'),
  isAxiosError: jest.fn(),
  default: jest.fn(),
};
jest.mock('axios', () => axiosMock);

const requestHelpers = {
  ...jest.requireActual('../../src/lib/openops-analytics/requests-helpers'),
  createAxiosHeadersForAnalytics: jest.fn(),
  makeOpenOpsAnalyticsPost: jest.fn(),
  makeOpenOpsAnalyticsGet: jest.fn(),
};
jest.mock(
  '../../src/lib/openops-analytics/requests-helpers',
  () => requestHelpers,
);

import { tryGetResource } from '../../src/lib/openops-analytics/resource';

describe('try get resource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return resource if it exists', async () => {
    requestHelpers.makeOpenOpsAnalyticsGet.mockResolvedValue({
      result: { id: 1, anotherProperty: 'some other property value' },
    });
    requestHelpers.createAxiosHeadersForAnalytics.mockReturnValue(
      'some header',
    );
    axiosMock.isAxiosError.mockReturnValue(false);

    const result = await tryGetResource(
      'some token',
      'some endpoint',
      'some resource name',
    );

    expect(result).toEqual({
      id: 1,
      anotherProperty: 'some other property value',
    });
    expect(requestHelpers.makeOpenOpsAnalyticsGet).toHaveBeenCalledTimes(1);
    expect(requestHelpers.makeOpenOpsAnalyticsGet).toHaveBeenCalledWith(
      'some endpoint',
      'some header',
      true,
    );
    expect(requestHelpers.createAxiosHeadersForAnalytics).toHaveBeenCalledTimes(
      1,
    );
    expect(requestHelpers.createAxiosHeadersForAnalytics).toHaveBeenCalledWith(
      'some token',
    );
    expect(axiosMock.isAxiosError).not.toHaveBeenCalled();
  });

  test('should return undefined if result is undefined', async () => {
    requestHelpers.makeOpenOpsAnalyticsGet.mockResolvedValue(undefined);
    requestHelpers.createAxiosHeadersForAnalytics.mockReturnValue(
      'some header',
    );

    const result = await tryGetResource(
      'some token',
      'some endpoint',
      'some resource name',
    );

    expect(result).toEqual(undefined);
    expect(requestHelpers.makeOpenOpsAnalyticsGet).toHaveBeenCalledTimes(1);
    expect(requestHelpers.makeOpenOpsAnalyticsGet).toHaveBeenCalledWith(
      'some endpoint',
      'some header',
      true,
    );
    expect(requestHelpers.createAxiosHeadersForAnalytics).toHaveBeenCalledTimes(
      1,
    );
    expect(requestHelpers.createAxiosHeadersForAnalytics).toHaveBeenCalledWith(
      'some token',
    );
    expect(axiosMock.isAxiosError).not.toHaveBeenCalled();
  });

  test('should return undefined if resource does not exist and axios returns 404', async () => {
    const error = {
      response: { status: 404 },
      isAxiosError: true,
    };
    requestHelpers.makeOpenOpsAnalyticsGet.mockRejectedValue(error);
    requestHelpers.createAxiosHeadersForAnalytics.mockReturnValue(
      'some header',
    );
    axiosMock.isAxiosError.mockReturnValue(true);

    const result = await tryGetResource(
      'some token',
      'some endpoint',
      'some resource name',
    );
    expect(result).toEqual(undefined);

    expect(requestHelpers.makeOpenOpsAnalyticsGet).toHaveBeenCalledTimes(1);
    expect(requestHelpers.makeOpenOpsAnalyticsGet).toHaveBeenCalledWith(
      'some endpoint',
      'some header',
      true,
    );
    expect(requestHelpers.createAxiosHeadersForAnalytics).toHaveBeenCalledTimes(
      1,
    );
    expect(requestHelpers.createAxiosHeadersForAnalytics).toHaveBeenCalledWith(
      'some token',
    );
    expect(axiosMock.isAxiosError).toHaveBeenCalledTimes(1);
    expect(axiosMock.isAxiosError).toHaveBeenCalledWith(error);
  });

  test('should throw if error status is not 404', async () => {
    const error = {
      response: { status: 500 },
      isAxiosError: true,
    };
    requestHelpers.makeOpenOpsAnalyticsGet.mockRejectedValue(error);
    requestHelpers.createAxiosHeadersForAnalytics.mockReturnValue(
      'some header',
    );

    await expect(
      tryGetResource('some token', 'some endpoint', 'some resource name'),
    ).rejects.toThrow(
      'Encountered an issue while trying to get some resource name. Error: {"response":{"status":500},"isAxiosError":true}',
    );

    expect(requestHelpers.makeOpenOpsAnalyticsGet).toHaveBeenCalledTimes(1);
    expect(requestHelpers.makeOpenOpsAnalyticsGet).toHaveBeenCalledWith(
      'some endpoint',
      'some header',
      true,
    );
    expect(requestHelpers.createAxiosHeadersForAnalytics).toHaveBeenCalledTimes(
      1,
    );
    expect(requestHelpers.createAxiosHeadersForAnalytics).toHaveBeenCalledWith(
      'some token',
    );
    expect(axiosMock.isAxiosError).toHaveBeenCalledTimes(1);
  });
});
