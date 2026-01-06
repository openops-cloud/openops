import { FastifyInstance } from 'fastify';

const analyticsDashboardServiceMock = {
  fetchFinopsDashboardEmbedId: jest.fn(),
  fetchDashboardGuestToken: jest.fn(),
};

jest.mock(
  '../../../src/app/openops-analytics/analytics-dashboard-service',
  () => ({
    analyticsDashboardService: analyticsDashboardServiceMock,
  }),
);

const analyticsAuthenticationServiceMock = {
  signIn: jest.fn(),
  signUp: jest.fn(),
};

jest.mock(
  '../../../src/app/authentication/analytics-authentication-service',
  () => ({
    analyticsAuthenticationService: analyticsAuthenticationServiceMock,
  }),
);

describe('authenticationController analytics routes', () => {
  const originalEnv = { ...process.env };

  const registerController = async (): Promise<{
    post: jest.Mock;
    get: jest.Mock;
  }> => {
    const { authenticationController } = await import(
      '../../../src/app/authentication/authentication.controller'
    );

    const appMock = {
      post: jest.fn().mockReturnThis(),
      get: jest.fn().mockReturnThis(),
    };

    await authenticationController(
      appMock as unknown as FastifyInstance,
      {} as never,
    );

    return appMock;
  };

  beforeEach(() => {
    jest.resetModules();
    analyticsDashboardServiceMock.fetchFinopsDashboardEmbedId.mockReset();
    analyticsDashboardServiceMock.fetchDashboardGuestToken.mockReset();
    analyticsAuthenticationServiceMock.signIn.mockReset();
    analyticsAuthenticationServiceMock.signUp.mockReset();

    process.env = {
      ...originalEnv,
      OPS_OPENOPS_ADMIN_EMAIL: 'local-admin@openops.com',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('skips analytics routes when analytics are disabled', async () => {
    process.env.OPS_ANALYTICS_ENABLED = 'false';

    const app = await registerController();

    expect(app.get).not.toHaveBeenCalled();
  });

  it('registers analytics routes when analytics are enabled', async () => {
    process.env.OPS_ANALYTICS_ENABLED = 'true';

    const app = await registerController();

    expect(app.get).toHaveBeenCalledTimes(2);

    const embedRoute = app.get.mock.calls.find(
      ([path]) => path === '/analytics-embed-id',
    );
    expect(embedRoute).toBeDefined();
    expect(embedRoute?.[1]).toEqual(expect.any(Function));

    const guestRoute = app.get.mock.calls.find(
      ([path]) => path === '/analytics-guest-token',
    );
    expect(guestRoute).toBeDefined();
    expect(guestRoute?.[2]).toEqual(expect.any(Function));
  });
});
