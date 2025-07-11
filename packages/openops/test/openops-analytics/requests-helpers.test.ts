const loggerMock = {
  error: jest.fn(),
};

const systemMock = {
  get: jest.fn(),
};

jest.mock('@openops/server-shared', () => ({
  AppSystemProp: {
    ANALYTICS_PRIVATE_URL: 'ANALYTICS_PRIVATE_URL',
  },
  logger: loggerMock,
  system: systemMock,
}));

const axiosMock = jest.fn();
jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  __esModule: true,
  default: axiosMock,
}));

import { AppSystemProp } from '@openops/server-shared';
import { AxiosHeaders } from 'axios';
import {
  makeOpenOpsAnalyticsGet,
  makeOpenOpsAnalyticsPost,
} from '../../src/lib/openops-analytics/requests-helpers';

describe('axios request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axiosMock.mockClear();
    systemMock.get.mockReturnValue('http://mockapi.com');
  });

  const header = new AxiosHeaders({ some: 'header' });

  describe('succesful calls', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      axiosMock.mockClear();
      axiosMock.mockResolvedValue({
        data: { test: 'some data' },
      });
    });

    const verifySuccessCall = async (
      method: string,
      result: any,
      header: AxiosHeaders,
      url: string,
      data: any,
      expectedResult: any,
    ) => {
      expect(result).toEqual(expectedResult);
      expect(systemMock.get).toHaveBeenCalledWith(
        AppSystemProp.ANALYTICS_PRIVATE_URL,
      );
      expect(axiosMock).toHaveBeenCalledWith({
        method,
        url,
        data,
        headers: header,
      });
      expect(loggerMock.error).not.toHaveBeenCalled();
    };

    test('should return data after successful get', async () => {
      const result = await makeOpenOpsAnalyticsGet('test/route/api', header);
      await verifySuccessCall(
        'GET',
        result,
        header,
        'http://mockapi.com/openops-analytics/api/v1/test/route/api',
        undefined,
        { test: 'some data' },
      );
    });

    test('should return data after successful post', async () => {
      const result = await makeOpenOpsAnalyticsPost(
        'test/route/api',
        { body: 'info' },
        header,
      );
      await verifySuccessCall(
        'POST',
        result,
        header,
        'http://mockapi.com/openops-analytics/api/v1/test/route/api',
        { body: 'info' },
        { test: 'some data' },
      );
    });
  });

  describe('failure calls', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      axiosMock.mockClear();
      axiosMock.mockRejectedValue(new Error('mock error'));
    });

    const verifyErrorCall = async (
      method: string,
      header: AxiosHeaders,
      url: string,
      data: any,
    ) => {
      expect(systemMock.get).toHaveBeenCalledWith(
        AppSystemProp.ANALYTICS_PRIVATE_URL,
      );
      expect(axiosMock).toHaveBeenCalledWith({
        method,
        url,
        data,
        headers: header,
      });
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Error calling OpenOps Analytics. Route: "test/route/api"',
        expect.objectContaining({ error: expect.any(Error) }),
      );
    };

    test('should log an error and throw an exception on failed get', async () => {
      await expect(
        makeOpenOpsAnalyticsGet('test/route/api', header),
      ).rejects.toThrow('mock error');
      await verifyErrorCall(
        'GET',
        header,
        'http://mockapi.com/openops-analytics/api/v1/test/route/api',
        undefined,
      );
    });

    test('should log an error and throw an exception on failed post', async () => {
      await expect(
        makeOpenOpsAnalyticsPost('test/route/api', { body: 'info' }, header),
      ).rejects.toThrow('mock error');
      await verifyErrorCall(
        'POST',
        header,
        'http://mockapi.com/openops-analytics/api/v1/test/route/api',
        { body: 'info' },
      );
    });
  });
});
