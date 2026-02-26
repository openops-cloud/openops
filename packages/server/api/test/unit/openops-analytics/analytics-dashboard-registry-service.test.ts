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

import { AnalyticsDashboard } from '@openops/shared';
import { registerDashboard } from '../../../src/app/openops-analytics/analytics-dashboard-registry-service';

const mockEntry: AnalyticsDashboard = {
  id: 'finops',
  name: 'FinOps Dashboard',
  slug: 'finops',
  embedId: 'some-embed-uuid',
  enabled: true,
};

describe('registerDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new registry with the entry as default when registry does not exist', async () => {
    mockFlagRepo.findOneBy.mockResolvedValue(null);

    await registerDashboard(mockEntry);

    expect(mockFlagRepo.save).toHaveBeenCalledTimes(1);
    expect(mockFlagRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        value: {
          dashboards: [mockEntry],
          defaultDashboardId: mockEntry.id,
        },
      }),
    );
  });

  it('updates an existing dashboard entry in the registry', async () => {
    const updatedEntry: AnalyticsDashboard = {
      ...mockEntry,
      embedId: 'new-uuid',
    };
    mockFlagRepo.findOneBy.mockResolvedValue({
      id: 'analytics-dashboards',
      value: {
        dashboards: [mockEntry],
        defaultDashboardId: mockEntry.id,
      },
    });

    await registerDashboard(updatedEntry);

    expect(mockFlagRepo.save).toHaveBeenCalledTimes(1);
    expect(mockFlagRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        value: {
          dashboards: [updatedEntry],
          defaultDashboardId: mockEntry.id,
        },
      }),
    );
  });

  it('appends a new dashboard entry to an existing registry', async () => {
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
        dashboards: [mockEntry],
        defaultDashboardId: mockEntry.id,
      },
    });

    await registerDashboard(otherEntry);

    expect(mockFlagRepo.save).toHaveBeenCalledTimes(1);
    expect(mockFlagRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        value: {
          dashboards: [mockEntry, otherEntry],
          defaultDashboardId: mockEntry.id,
        },
      }),
    );
  });
});
