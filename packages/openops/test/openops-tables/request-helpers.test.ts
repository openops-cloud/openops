const httpRequestMock = jest.fn();
jest.mock('../../src/lib/axios-wrapper', () => ({
  makeHttpRequest: httpRequestMock,
}));

const systemMock = {
  get: jest.fn(),
  getNumber: jest.fn(),
  getBoolean: jest.fn(),
  getOrThrow: jest.fn(),
};

jest.mock('@openops/server-shared', () => ({
  AppSystemProp: {
    OPENOPS_TABLES_API_URL: 'OPENOPS_TABLES_API_URL',
  },
  system: systemMock,
}));

import { AppSystemProp } from '@openops/server-shared';
import { AxiosHeaders } from 'axios';
import { IAxiosRetryConfig } from 'axios-retry';
import {
  axiosTablesRetryConfig,
  makeOpenOpsTablesDelete,
  makeOpenOpsTablesGet,
  makeOpenOpsTablesPatch,
  makeOpenOpsTablesPost,
  makeOpenOpsTablesPut,
} from '../../src/lib/openops-tables/requests-helpers';

describe('axios request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    systemMock.get.mockReturnValue('https://mockapi.com');
    systemMock.getNumber.mockReturnValue(60);
    systemMock.getBoolean.mockReturnValue(false);
    systemMock.getOrThrow.mockReturnValue('mock-value');
  });

  const header = new AxiosHeaders({ some: 'header' });
  const TEST_URL = 'https://mockapi.com/openops-tables/test/route/api';

  const retryConfigTestCases = [
    {
      name: 'default retry config',
      retryConfig: undefined,
      expectedRetryConfig: axiosTablesRetryConfig,
    },
    {
      name: 'custom retry config',
      retryConfig: {
        retries: 5,
        retryDelay: () => 2000,
        retryCondition: () => true,
      } as IAxiosRetryConfig,
      expectedRetryConfig: expect.objectContaining({ retries: 5 }),
    },
  ];

  test.each(retryConfigTestCases)(
    'should return data after get ($name)',
    async ({ retryConfig, expectedRetryConfig }) => {
      httpRequestMock.mockResolvedValue({ next: undefined });

      const result = await makeOpenOpsTablesGet(
        'test/route/api',
        header,
        retryConfig,
      );

      expect(result).toEqual([{ next: undefined }]);
      expect(httpRequestMock).toHaveBeenCalledWith(
        'GET',
        TEST_URL,
        header,
        undefined,
        expectedRetryConfig,
      );
    },
  );

  test.each(retryConfigTestCases)(
    'should return data after patch ($name)',
    async ({ retryConfig, expectedRetryConfig }) => {
      httpRequestMock.mockResolvedValue('mockResult');

      const result = await makeOpenOpsTablesPatch(
        'test/route/api',
        { body: 'info' },
        header,
        retryConfig,
      );

      expect(result).toEqual('mockResult');
      expect(httpRequestMock).toHaveBeenCalledWith(
        'PATCH',
        TEST_URL,
        header,
        { body: 'info' },
        expectedRetryConfig,
      );
    },
  );

  test.each(retryConfigTestCases)(
    'should return data after successful post ($name)',
    async ({ retryConfig, expectedRetryConfig }) => {
      httpRequestMock.mockResolvedValue('mockResult');

      const result = await makeOpenOpsTablesPost(
        'test/route/api',
        { body: 'info' },
        header,
        retryConfig,
      );

      expect(result).toEqual('mockResult');
      expect(httpRequestMock).toHaveBeenCalledWith(
        'POST',
        TEST_URL,
        header,
        { body: 'info' },
        expectedRetryConfig,
      );
    },
  );

  test.each(retryConfigTestCases)(
    'should return data after put ($name)',
    async ({ retryConfig, expectedRetryConfig }) => {
      httpRequestMock.mockResolvedValue('mockResult');

      const result = await makeOpenOpsTablesPut(
        'test/route/api',
        { body: 'info' },
        header,
        retryConfig,
      );

      expect(result).toEqual('mockResult');
      expect(httpRequestMock).toHaveBeenCalledWith(
        'PUT',
        TEST_URL,
        header,
        { body: 'info' },
        expectedRetryConfig,
      );
    },
  );

  test.each(retryConfigTestCases)(
    'should return data after delete ($name)',
    async ({ retryConfig, expectedRetryConfig }) => {
      httpRequestMock.mockResolvedValue('mockResult');

      const result = await makeOpenOpsTablesDelete(
        'test/route/api',
        header,
        retryConfig,
      );

      expect(result).toEqual('mockResult');
      expect(httpRequestMock).toHaveBeenCalledWith(
        'DELETE',
        TEST_URL,
        header,
        undefined,
        expectedRetryConfig,
      );
    },
  );

  test.each(retryConfigTestCases)(
    'Should return all pages for paginated request ($name).',
    async ({ retryConfig, expectedRetryConfig }) => {
      httpRequestMock
        .mockResolvedValueOnce({
          test: 'some data one',
          next: 'next url',
        })
        .mockResolvedValueOnce({
          test: 'some data two',
          next: 'next url two',
        })
        .mockResolvedValueOnce({
          test: 'some data three',
        });
      const result = await makeOpenOpsTablesGet(
        'test/route/api',
        header,
        retryConfig,
      );

      expect(result).toEqual([
        { test: 'some data one', next: 'next url' },
        { test: 'some data two', next: 'next url two' },
        { test: 'some data three' },
      ]);
      expect(systemMock.get).toHaveBeenCalledWith(
        AppSystemProp.OPENOPS_TABLES_API_URL,
      );
      expect(httpRequestMock).toHaveBeenNthCalledWith(
        1,
        'GET',
        TEST_URL,
        header,
        undefined,
        expectedRetryConfig,
      );

      expect(httpRequestMock).toHaveBeenNthCalledWith(
        2,
        'GET',
        'next url',
        header,
        undefined,
        expectedRetryConfig,
      );

      expect(httpRequestMock).toHaveBeenNthCalledWith(
        3,
        'GET',
        'next url two',
        header,
        undefined,
        expectedRetryConfig,
      );
    },
  );
});
