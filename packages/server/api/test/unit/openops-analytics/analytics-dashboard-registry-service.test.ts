const mockFlagRepo = {
  findOneBy: jest.fn(),
  save: jest.fn(),
};

const mockDatabaseConnection = {
  getRepository: jest.fn().mockReturnValue(mockFlagRepo),
};

jest.mock('../../../src/app/database/database-connection', () => ({
  databaseConnection: jest.fn().mockReturnValue(mockDatabaseConnection),
}));

jest.mock('@openops/server-shared', () => {
  const originalModule = jest.requireActual('@openops/server-shared');
  return {
    __esModule: true,
    ...originalModule,
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    system: {
      ...originalModule.system,
      getBoolean: jest.fn(() => true),
    },
  };
});

const mockFetchFinopsDashboardEmbedDetails = jest.fn();
jest.mock('@openops/common', () => ({
  fetchFinopsDashboardEmbedDetails: mockFetchFinopsDashboardEmbedDetails,
}));

import { AnalyticsDashboard } from '@openops/shared';
import { upsertDashboard } from '../../../src/app/openops-analytics/analytics-dashboard-registry-service';

const ACCESS_TOKEN = 'test-access-token';

const mockFinopsEntry: AnalyticsDashboard = {
  id: 'finops',
  name: 'FinOps',
  slug: 'finops',
  embedId: 'finops-embed-uuid',
  enabled: true,
};

const mockEntry: AnalyticsDashboard = {
  id: 'aws_benchmark',
  name: 'AWS Benchmark',
  slug: 'aws_benchmark',
  embedId: 'benchmark-uuid',
  enabled: true,
};

describe('upsertDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchFinopsDashboardEmbedDetails.mockResolvedValue({
      result: { uuid: 'finops-embed-uuid' },
    });
  });

  it('creates a new registry with finops as default and the entry when registry does not exist', async () => {
    mockFlagRepo.findOneBy.mockResolvedValue(null);

    await upsertDashboard(mockEntry, ACCESS_TOKEN);

    expect(mockFetchFinopsDashboardEmbedDetails).toHaveBeenCalledWith(
      ACCESS_TOKEN,
    );
    expect(mockFlagRepo.save).toHaveBeenCalledTimes(1);
    expect(mockFlagRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        value: {
          dashboards: [mockFinopsEntry, mockEntry],
          defaultDashboardId: 'finops',
        },
      }),
    );
  });

  it('updates an existing dashboard entry in the registry without fetching finops', async () => {
    const updatedEntry: AnalyticsDashboard = {
      ...mockEntry,
      embedId: 'new-uuid',
    };
    mockFlagRepo.findOneBy.mockResolvedValue({
      id: 'analytics-dashboards',
      value: {
        dashboards: [mockFinopsEntry, mockEntry],
        defaultDashboardId: 'finops',
      },
    });

    await upsertDashboard(updatedEntry, ACCESS_TOKEN);

    expect(mockFetchFinopsDashboardEmbedDetails).not.toHaveBeenCalled();
    expect(mockFlagRepo.save).toHaveBeenCalledTimes(1);
    expect(mockFlagRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        value: {
          dashboards: [mockFinopsEntry, updatedEntry],
          defaultDashboardId: 'finops',
        },
      }),
    );
  });

  it('creates a registry with only one entry when the entry is the FinOps dashboard', async () => {
    mockFlagRepo.findOneBy.mockResolvedValue(null);

    await upsertDashboard(mockFinopsEntry, ACCESS_TOKEN);

    expect(mockFlagRepo.save).toHaveBeenCalledTimes(1);
    expect(mockFlagRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        value: {
          dashboards: [mockFinopsEntry],
          defaultDashboardId: 'finops',
        },
      }),
    );
  });

  it('appends a new dashboard entry to an existing registry without fetching finops', async () => {
    const otherEntry: AnalyticsDashboard = {
      id: 'other',
      name: 'Other Dashboard',
      slug: 'other',
      embedId: 'other-uuid',
      enabled: true,
    };
    mockFlagRepo.findOneBy.mockResolvedValue({
      id: 'analytics-dashboards',
      value: {
        dashboards: [mockFinopsEntry, mockEntry],
        defaultDashboardId: 'finops',
      },
    });

    await upsertDashboard(otherEntry, ACCESS_TOKEN);

    expect(mockFetchFinopsDashboardEmbedDetails).not.toHaveBeenCalled();
    expect(mockFlagRepo.save).toHaveBeenCalledTimes(1);
    expect(mockFlagRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        value: {
          dashboards: [mockFinopsEntry, mockEntry, otherEntry],
          defaultDashboardId: 'finops',
        },
      }),
    );
  });
});
