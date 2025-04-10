const httpRequestMock = jest.fn();
jest.mock('../../src/lib/axios-wrapper', () => ({
  makeHttpRequest: httpRequestMock,
}));

const systemMock = {
  get: jest.fn(),
};

jest.mock('@openops/server-shared', () => ({
  AppSystemProp: {
    OPENOPS_TABLES_API_URL: 'OPENOPS_TABLES_API_URL',
  },
  system: systemMock,
}));

import { AppSystemProp } from '@openops/server-shared';
import { AxiosHeaders } from 'axios';
import {
  makeOpenOpsTablesGet,
  makeOpenOpsTablesPatch,
  makeOpenOpsTablesPost,
} from '../../src/lib/openops-tables/requests-helpers';

describe('axios request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    systemMock.get.mockReturnValue('http://mockapi.com');
  });

  const header = new AxiosHeaders({ some: 'header' });

  test('should return data after get', async () => {
    httpRequestMock.mockResolvedValue({ next: undefined });

    const result = await makeOpenOpsTablesGet('test/route/api', header);

    expect(result).toEqual([{ next: undefined }]);
    expect(httpRequestMock).toHaveBeenCalledWith(
      'GET',
      'http://mockapi.com/openops-tables/test/route/api',
      header,
      undefined,
      undefined,
    );
  });

  test('should return data after patch', async () => {
    httpRequestMock.mockResolvedValue('mockResult');

    const result = await makeOpenOpsTablesPatch(
      'test/route/api',
      { body: 'info' },
      header,
    );

    expect(result).toEqual('mockResult');
    expect(httpRequestMock).toHaveBeenCalledWith(
      'PATCH',
      'http://mockapi.com/openops-tables/test/route/api',
      header,
      { body: 'info' },
      undefined,
    );
  });

  test('should return data after successful post', async () => {
    httpRequestMock.mockResolvedValue('mockResult');

    const result = await makeOpenOpsTablesPost(
      'test/route/api',
      { body: 'info' },
      header,
    );

    expect(result).toEqual('mockResult');
    expect(httpRequestMock).toHaveBeenCalledWith(
      'POST',
      'http://mockapi.com/openops-tables/test/route/api',
      header,
      { body: 'info' },
      undefined,
    );
  });

  test('Should return all pages for paginated request.', async () => {
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
    const result = await makeOpenOpsTablesGet('test/route/api', header);

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
      'http://mockapi.com/openops-tables/test/route/api',
      header,
      undefined,
      undefined,
    );

    expect(httpRequestMock).toHaveBeenNthCalledWith(
      2,
      'GET',
      'next url',
      header,
      undefined,
      undefined,
    );

    expect(httpRequestMock).toHaveBeenNthCalledWith(
      3,
      'GET',
      'next url two',
      header,
      undefined,
      undefined,
    );
  });
});
