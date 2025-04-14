const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  authenticateOpenOpsAnalyticsAdmin: jest.fn(),
  getTableIdByTableName: jest.fn(),
};
jest.mock('@openops/common', () => openopsCommonMock);

const dashboardCommonMock = {
  ...jest.requireActual('../../../src/app/openops-analytics/dashboard'),
  createOrGetDashboard: jest.fn(),
  getDashboardWithSlugOrId: jest.fn(),
};
jest.mock(
  '../../../src/app/openops-analytics/dashboard',
  () => dashboardCommonMock,
);

jest.mock('@openops/server-shared', () => {
  const originalModule = jest.requireActual('@openops/server-shared');
  return {
    __esModule: true,
    ...originalModule,

    system: {
      ...originalModule.system,
      getBoolean: jest.fn(() => true),
    },
  };
});

const createDbMock = jest.fn();
jest.mock(
  '../../../src/app/openops-analytics/create-database-connection',
  () => {
    return {
      getOrCreatePostgresDatabaseConnection: createDbMock,
    };
  },
);

const getOrCreateDatasetMock = jest.fn();
jest.mock('../../../src/app/openops-analytics/create-dataset', () => {
  return {
    getOrCreateDataset: getOrCreateDatasetMock,
  };
});

const createHomepageChartsMock = jest.fn();
jest.mock('../../../src/app/openops-analytics/populate-homepage', () => {
  return {
    createHomepageCharts: createHomepageChartsMock,
  };
});

import { seedAnalyticsDashboards } from '../../../src/app/openops-analytics/analytics-seeding-service';
import { SEED_OPENOPS_TABLE_NAME } from '../../../src/app/openops-tables/template-tables/create-opportunities-table';

describe('seedAnalyticsDashboards', () => {
  beforeEach(() => {
    jest.clearAllMocks(), (process.env.OPS_POSTGRES_PASSWORD = 'some password');
    process.env.OPS_POSTGRES_PORT = 'some port';
    process.env.OPS_POSTGRES_USERNAME = 'some username';
    process.env.OPS_POSTGRES_HOST = 'some host';
    process.env.OPS_OPENOPS_TABLES_DATABASE_NAME = 'some dbName';
    delete process.env.OPS_OPENOPS_TABLES_DB_HOST;
  });

  it('should succesfully create seed related objects', async () => {
    openopsCommonMock.getTableIdByTableName.mockResolvedValue(1);
    openopsCommonMock.authenticateOpenOpsAnalyticsAdmin.mockResolvedValue({
      access_token: 'some token',
    });
    getOrCreateDatasetMock.mockResolvedValue({ id: 1 });
    dashboardCommonMock.createOrGetDashboard
      .mockResolvedValueOnce({ id: 1, dashboard_title: 'some title' })
      .mockResolvedValueOnce({ id: 2, dashboard_title: 'some title 2' });
    createDbMock.mockResolvedValue({ id: 1 });

    await seedAnalyticsDashboards();

    expect(
      openopsCommonMock.authenticateOpenOpsAnalyticsAdmin,
    ).toHaveBeenCalledTimes(1);
    expect(
      openopsCommonMock.authenticateOpenOpsAnalyticsAdmin,
    ).toHaveBeenCalledWith();
    expect(dashboardCommonMock.createOrGetDashboard).toHaveBeenCalledTimes(1);
    expect(dashboardCommonMock.createOrGetDashboard).toHaveBeenNthCalledWith(
      1,
      'some token',
      'Homepage',
      'homepage',
    );
    expect(createDbMock).toHaveBeenCalledTimes(1);
    expect(createDbMock).toHaveBeenCalledWith(
      'some token',
      'some dbName',
      'some password',
      'some port',
      'some username',
      'some host',
      'openops_tables_connection',
    );
    expect(getOrCreateDatasetMock).toHaveBeenCalledTimes(1);
    expect(getOrCreateDatasetMock).toHaveBeenCalledWith(
      'some token',
      `${SEED_OPENOPS_TABLE_NAME}_1_userfriendly`,
      1,
      'public',
    );
    expect(createHomepageChartsMock).toHaveBeenCalledTimes(1);
    expect(createHomepageChartsMock).toHaveBeenCalledWith(
      'some token',
      1,
      1,
      1,
    );
    expect(openopsCommonMock.getTableIdByTableName).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getTableIdByTableName).toHaveBeenCalledWith(
      'Opportunities',
    );
  });

  it('should not create dataset and log error if table with seed name was not found.', async () => {
    openopsCommonMock.getTableIdByTableName.mockRejectedValueOnce(
      new Error('Table not found'),
    );
    openopsCommonMock.authenticateOpenOpsAnalyticsAdmin.mockResolvedValue({
      access_token: 'some token',
    });
    dashboardCommonMock.createOrGetDashboard
      .mockResolvedValueOnce({ id: 1, dashboard_title: 'some title' })
      .mockResolvedValueOnce({ id: 2, dashboard_title: 'some other title' });
    dashboardCommonMock.getDashboardWithSlugOrId.mockResolvedValue({
      result: { id: 1, dashboard_name: 'some name' },
    });
    createDbMock.mockResolvedValue({ id: 1 });

    await seedAnalyticsDashboards();

    expect(getOrCreateDatasetMock).not.toHaveBeenCalled();
    expect(createHomepageChartsMock).not.toHaveBeenCalled();
    expect(openopsCommonMock.getTableIdByTableName).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getTableIdByTableName).toHaveBeenCalledWith(
      'Opportunities',
    );
  });

  it('should user alternative host name if provided', async () => {
    openopsCommonMock.getTableIdByTableName.mockResolvedValue(1);
    process.env.OPS_OPENOPS_TABLES_DB_HOST = 'alternative host';
    openopsCommonMock.authenticateOpenOpsAnalyticsAdmin.mockResolvedValue({
      access_token: 'some token',
    });
    dashboardCommonMock.createOrGetDashboard
      .mockResolvedValueOnce({ id: 1, dashboard_title: 'some title' })
      .mockResolvedValueOnce({ id: 2, dashboard_title: 'some other title' });
    dashboardCommonMock.getDashboardWithSlugOrId.mockResolvedValue({
      result: { id: 1, dashboard_name: 'some name' },
    });
    createDbMock.mockResolvedValue({ id: 1 });

    await seedAnalyticsDashboards();

    expect(createDbMock).toHaveBeenCalledTimes(1);
    expect(createDbMock).toHaveBeenCalledWith(
      'some token',
      'some dbName',
      'some password',
      'some port',
      'some username',
      'alternative host',
      'openops_tables_connection',
    );
  });

  it('should throw if something fails', async () => {
    openopsCommonMock.authenticateOpenOpsAnalyticsAdmin.mockRejectedValue(
      new Error('some error'),
    );

    await expect(seedAnalyticsDashboards()).rejects.toThrow('some error');
  });
});
