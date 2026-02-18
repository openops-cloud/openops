const loggerMock = {
  info: jest.fn(),
  warn: jest.fn(),
};
jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  logger: loggerMock,
  system: {
    get: jest.fn().mockReturnValue('http://localhost:8088'),
    getBoolean: jest.fn().mockReturnValue(false),
    getNumber: jest.fn().mockReturnValue(10),
    getOrThrow: jest.fn((key) => `mock-${key}`),
  },
}));

const axiosMock = {
  ...jest.requireActual('axios'),
  isAxiosError: jest.fn(),
};
jest.mock('axios', () => axiosMock);

const deleteDatasetMock = {
  deleteDataset: jest.fn(),
};
jest.mock(
  '../../../src/app/openops-analytics/delete-dataset',
  () => deleteDatasetMock,
);

const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  createAxiosHeadersForAnalytics: jest.fn(),
  makeOpenOpsAnalyticsPost: jest.fn(),
  makeOpenOpsAnalyticsGet: jest.fn(),
};
jest.mock('@openops/common', () => openopsCommonMock);

import { createDataset } from '../../../src/app/openops-analytics/create-dataset';

describe('createDataset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create virtual dataset with SQL', async () => {
    openopsCommonMock.makeOpenOpsAnalyticsPost.mockResolvedValue({
      id: 2,
      uuid: 'virtual-uuid-456',
      result: {},
    });
    openopsCommonMock.createAxiosHeadersForAnalytics.mockReturnValue(
      'some header',
    );
    openopsCommonMock.makeOpenOpsAnalyticsGet.mockResolvedValue({
      result: [],
    });

    const result = await createDataset('some token', {
      tableName: 'virtual_dataset',
      databaseId: 1,
      schema: 'public',
      sql: 'SELECT * FROM table',
      recreateIfExists: false,
    });

    expect(result).toEqual({ id: 2, uuid: 'virtual-uuid-456' });
    expect(openopsCommonMock.makeOpenOpsAnalyticsPost).toHaveBeenCalledWith(
      'dataset',
      {
        database: 1,
        table_name: 'virtual_dataset',
        schema: 'public',
        sql: 'SELECT * FROM table',
      },
      'some header',
    );
  });

  test('should create physical dataset without SQL', async () => {
    openopsCommonMock.makeOpenOpsAnalyticsGet.mockResolvedValue({
      result: [],
    });
    openopsCommonMock.makeOpenOpsAnalyticsPost.mockResolvedValue({
      id: 20,
      uuid: 'physical-uuid',
      result: {},
    });
    openopsCommonMock.createAxiosHeadersForAnalytics.mockReturnValue(
      'some header',
    );

    const result = await createDataset('some token', {
      tableName: 'physical_table',
      databaseId: 2,
      schema: 'analytics',
      recreateIfExists: false,
    });

    expect(result).toEqual({ id: 20, uuid: 'physical-uuid' });
    expect(openopsCommonMock.makeOpenOpsAnalyticsPost).toHaveBeenCalledWith(
      'dataset',
      {
        database: 2,
        table_name: 'physical_table',
        schema: 'analytics',
      },
      'some header',
    );
    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.stringContaining('Created dataset'),
      expect.objectContaining({
        isVirtual: false,
      }),
    );
  });

  test('should delete and recreate dataset when recreateIfExists is true', async () => {
    openopsCommonMock.makeOpenOpsAnalyticsGet.mockResolvedValue({
      result: [{ id: 3, uuid: 'old-uuid', otherProperty: 'existing dataset' }],
    });
    openopsCommonMock.makeOpenOpsAnalyticsPost.mockResolvedValue({
      id: 4,
      uuid: 'new-uuid-789',
      result: {},
    });
    openopsCommonMock.createAxiosHeadersForAnalytics.mockReturnValue(
      'some header',
    );
    deleteDatasetMock.deleteDataset.mockResolvedValue(undefined);

    const result = await createDataset('some token', {
      tableName: 'recreated_dataset',
      databaseId: 1,
      schema: 'public',
      sql: 'SELECT * FROM updated_table',
      recreateIfExists: true,
    });

    expect(result).toEqual({ id: 4, uuid: 'new-uuid-789' });
    expect(deleteDatasetMock.deleteDataset).toHaveBeenCalledTimes(1);
    expect(deleteDatasetMock.deleteDataset).toHaveBeenCalledWith(
      'some token',
      3,
    );
    expect(openopsCommonMock.makeOpenOpsAnalyticsPost).toHaveBeenCalledWith(
      'dataset',
      {
        database: 1,
        table_name: 'recreated_dataset',
        schema: 'public',
        sql: 'SELECT * FROM updated_table',
      },
      'some header',
    );
  });

  test('should return existing dataset when found and recreateIfExists is false', async () => {
    openopsCommonMock.makeOpenOpsAnalyticsGet.mockResolvedValue({
      result: [
        {
          id: 10,
          uuid: 'existing-uuid-abc',
          table_name: 'existing_table',
          schema: 'public',
        },
      ],
    });
    openopsCommonMock.createAxiosHeadersForAnalytics.mockReturnValue(
      'some header',
    );

    const result = await createDataset('some token', {
      tableName: 'existing_table',
      databaseId: 1,
      schema: 'public',
      recreateIfExists: false,
    });

    expect(result).toEqual({
      id: 10,
      uuid: 'existing-uuid-abc',
      table_name: 'existing_table',
      schema: 'public',
    });
    expect(deleteDatasetMock.deleteDataset).not.toHaveBeenCalled();
    expect(openopsCommonMock.makeOpenOpsAnalyticsPost).not.toHaveBeenCalled();
  });

  test('should always include uuid in response', async () => {
    openopsCommonMock.makeOpenOpsAnalyticsPost.mockResolvedValue({
      id: 5,
      uuid: 'always-included-uuid',
      result: { property: 'value' },
    });
    openopsCommonMock.createAxiosHeadersForAnalytics.mockReturnValue(
      'some header',
    );
    openopsCommonMock.makeOpenOpsAnalyticsGet.mockResolvedValue({
      result: [],
    });

    const result = await createDataset('some token', {
      tableName: 'physical_dataset',
      databaseId: 1,
      schema: 'public',
      recreateIfExists: false,
    });

    expect(result).toEqual({
      id: 5,
      uuid: 'always-included-uuid',
      property: 'value',
    });
    expect(result.uuid).toBe('always-included-uuid');
  });
});
