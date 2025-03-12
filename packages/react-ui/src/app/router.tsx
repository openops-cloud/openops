import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useLocation,
} from 'react-router-dom';

import { PageTitle } from '@/app/common/components/page-title';
import ProjectSettingsLayout from '@/app/common/components/project-settings-layout';
import { VerifyEmail } from '@/app/features/authentication/components/verify-email';
import { RedirectPage } from '@/app/routes/redirect';
import { FlowRunsPage } from '@/app/routes/runs';
import { ProjectBlocksPage } from '@/app/routes/settings/blocks';

import { FlowsPage } from '../app/routes/flows';

import { PageHeader } from '@openops/components/ui';
import { t } from 'i18next';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { FlowsPageHeader } from '@/app/features/flows/components/flows-page-header';
import { HomeHelpDropdown } from '@/app/features/home/components/home-help-dropdown';
import { FlagId } from '@openops/shared';
import { lazy, Suspense } from 'react';
import {
  OpsErrorBoundary,
  RouteErrorBoundary,
} from './common/error-boundaries/ops-error-boundary';
import { AllowOnlyLoggedInUserOnlyGuard } from './common/guards/allow-logged-in-user-only-guard';
import { ConnectionsHeader } from './features/connections/components/connection-table';
import { ConnectionsProvider } from './features/connections/components/connections-context';
import { DashboardContainer } from './features/navigation/dashboard-container';
import NotFoundPage from './routes/404-page';
import { ChangePasswordPage } from './routes/change-password';
import AppConnectionsPage from './routes/connections';
import { FlowBuilderPage } from './routes/flows/id';
import { ResetPasswordPage } from './routes/forget-password';
import { HomePage } from './routes/home';
import { HomeDemoPage, HomeDemoPageHeader } from './routes/home-demo';
import { OpenOpsAnalyticsPage } from './routes/openops-analytics';
import { OpenOpsTablesPage } from './routes/openops-tables';
import { FlowRunPage } from './routes/runs/id';
import AppearancePage from './routes/settings/appearance';
import GeneralPage from './routes/settings/general';
import { SignInPage } from './routes/sign-in';
import { SignUpPage } from './routes/sign-up';

const SettingsRerouter = () => {
  const { hash } = useLocation();
  const fragmentWithoutHash = hash.slice(1).toLowerCase();
  return fragmentWithoutHash ? (
    <Navigate to={`/settings/${fragmentWithoutHash}`} replace />
  ) : (
    <Navigate to="/settings/general" replace />
  );
};

const createRoutes = () => {
  const { data: isCloudConnectionPageEnabled } = flagsHooks.useFlag<any>(
    FlagId.CLOUD_CONNECTION_PAGE_ENABLED,
  );

  const { data: isDemoHomePage } = flagsHooks.useFlag<any>(
    FlagId.SHOW_DEMO_HOME_PAGE,
  );

  const routes = [
    {
      path: '/flows',
      element: (
        <DashboardContainer
          pageHeader={<FlowsPageHeader title={t('Workflows')} />}
        >
          <OpsErrorBoundary>
            <PageTitle title="Workflows">
              <FlowsPage />
            </PageTitle>
          </OpsErrorBoundary>
        </DashboardContainer>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/flows/:flowId',
      element: (
        <AllowOnlyLoggedInUserOnlyGuard>
          <OpsErrorBoundary>
            <PageTitle title="Builder">
              <FlowBuilderPage />
            </PageTitle>
          </OpsErrorBoundary>
        </AllowOnlyLoggedInUserOnlyGuard>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/runs/:runId',
      element: (
        <AllowOnlyLoggedInUserOnlyGuard>
          <OpsErrorBoundary>
            <PageTitle title="Workflow Run">
              <FlowRunPage />
            </PageTitle>
          </OpsErrorBoundary>
        </AllowOnlyLoggedInUserOnlyGuard>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/runs',
      element: (
        <DashboardContainer
          pageHeader={<PageHeader title={t('Workflow Runs')} />}
        >
          <OpsErrorBoundary>
            <PageTitle title="Runs">
              <FlowRunsPage />
            </PageTitle>
          </OpsErrorBoundary>
        </DashboardContainer>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/connections',
      element: (
        <ConnectionsProvider>
          <DashboardContainer pageHeader={<ConnectionsHeader />}>
            <OpsErrorBoundary>
              <PageTitle title="Connections">
                <AppConnectionsPage />
              </PageTitle>
            </OpsErrorBoundary>
          </DashboardContainer>
        </ConnectionsProvider>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/settings',
      element: (
        <DashboardContainer pageHeader={<PageHeader title={t('Settings')} />}>
          <OpsErrorBoundary>
            <SettingsRerouter />
          </OpsErrorBoundary>
        </DashboardContainer>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/forget-password',
      element: (
        <OpsErrorBoundary>
          <PageTitle title="Forget Password">
            <ResetPasswordPage />
          </PageTitle>
        </OpsErrorBoundary>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/reset-password',
      element: (
        <OpsErrorBoundary>
          <PageTitle title="Reset Password">
            <ChangePasswordPage />
          </PageTitle>
        </OpsErrorBoundary>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/sign-in',
      element: (
        <OpsErrorBoundary>
          <PageTitle title="Sign In">
            <SignInPage />
          </PageTitle>
        </OpsErrorBoundary>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/verify-email',
      element: (
        <OpsErrorBoundary>
          <PageTitle title="Verify Email">
            <VerifyEmail />
          </PageTitle>
        </OpsErrorBoundary>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/sign-up',
      element: (
        <OpsErrorBoundary>
          <PageTitle title="Sign Up">
            <SignUpPage />
          </PageTitle>
        </OpsErrorBoundary>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/settings/appearance',
      element: (
        <DashboardContainer pageHeader={<PageHeader title={t('Settings')} />}>
          <ProjectSettingsLayout>
            <OpsErrorBoundary>
              <PageTitle title="Appearance">
                <AppearancePage />
              </PageTitle>
            </OpsErrorBoundary>
          </ProjectSettingsLayout>
        </DashboardContainer>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/settings/general',
      element: (
        <DashboardContainer pageHeader={<PageHeader title={t('Settings')} />}>
          <ProjectSettingsLayout>
            <OpsErrorBoundary>
              <PageTitle title="General">
                <GeneralPage />
              </PageTitle>
            </OpsErrorBoundary>
          </ProjectSettingsLayout>
        </DashboardContainer>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/settings/blocks',
      element: (
        <DashboardContainer pageHeader={<PageHeader title={t('Settings')} />}>
          <ProjectSettingsLayout>
            <OpsErrorBoundary>
              <PageTitle title="Blocks">
                <ProjectBlocksPage />
              </PageTitle>
            </OpsErrorBoundary>
          </ProjectSettingsLayout>
        </DashboardContainer>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/tables',
      element: (
        <DashboardContainer
          useEntireInnerViewport
          pageHeader={<PageHeader title={t('Tables')} />}
        >
          <PageTitle title="Tables">
            <OpenOpsTablesPage />
          </PageTitle>
        </DashboardContainer>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/analytics',
      element: (
        <DashboardContainer useEntireInnerViewport>
          <OpsErrorBoundary>
            <PageTitle title="Analytics">
              <OpenOpsAnalyticsPage />
            </PageTitle>
          </OpsErrorBoundary>
        </DashboardContainer>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/404',
      element: (
        <OpsErrorBoundary>
          <PageTitle title="Not Found">
            <NotFoundPage />
          </PageTitle>
        </OpsErrorBoundary>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/redirect',
      element: <RedirectPage></RedirectPage>,
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/*',
      element: (
        <OpsErrorBoundary>
          <PageTitle title="Redirect">
            <Navigate to={'/'} replace />
          </PageTitle>
        </OpsErrorBoundary>
      ),
      errorElement: <RouteErrorBoundary />,
    },
  ];

  if (isCloudConnectionPageEnabled) {
    const CloudConnectionPage = lazy(
      () => import('@/app/routes/cloud-connection'),
    );
    const CloudLogoutPage = lazy(
      () => import('@/app/routes/cloud-connection/cloud-logout-page'),
    );

    routes.push({
      path: '/connect',
      element: (
        <Suspense>
          <CloudConnectionPage />
        </Suspense>
      ),
      errorElement: <RouteErrorBoundary />,
    });
    routes.push({
      path: '/oauth/callback',
      element: (
        <Suspense>
          <CloudConnectionPage />
        </Suspense>
      ),
      errorElement: <RouteErrorBoundary />,
    });
    routes.push({
      path: '/oauth/logout',
      element: (
        <Suspense>
          <CloudLogoutPage />
        </Suspense>
      ),
      errorElement: <RouteErrorBoundary />,
    });
  }

  if (!isDemoHomePage) {
    routes.push({
      path: '/',
      element: (
        <DashboardContainer
          pageHeader={
            <FlowsPageHeader title={t('Overview')}>
              <HomeHelpDropdown />
            </FlowsPageHeader>
          }
        >
          <OpsErrorBoundary>
            <PageTitle title="Home">
              <HomePage />
            </PageTitle>
          </OpsErrorBoundary>
        </DashboardContainer>
      ),
      errorElement: <RouteErrorBoundary />,
    });
  } else {
    routes.push({
      path: '/',
      element: (
        <DashboardContainer pageHeader={<HomeDemoPageHeader />}>
          <OpsErrorBoundary>
            <PageTitle title="Home">
              <HomeDemoPage />
            </PageTitle>
          </OpsErrorBoundary>
        </DashboardContainer>
      ),
      errorElement: <RouteErrorBoundary />,
    });
  }

  return routes;
};

const ApplicationRouter = () => {
  const router = createBrowserRouter(createRoutes());
  return <RouterProvider router={router}></RouterProvider>;
};

export { ApplicationRouter };
