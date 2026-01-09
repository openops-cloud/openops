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
import { AiSettingsPage } from '@/app/routes/settings/ai';
import { FlagId } from '@openops/shared';
import { lazy, Suspense } from 'react';
import {
  OpsErrorBoundary,
  RouteErrorBoundary,
} from './common/error-boundaries/ops-error-boundary';
import { ConnectionsHeader } from './features/connections/components/connection-table';
import { ConnectionsProvider } from './features/connections/components/connections-context';
import { GlobalLayout } from './features/navigation/layout/global-layout';
import { RouteWrapper } from './features/navigation/layout/route-wrapper';
import { authenticationSession } from './lib/authentication-session';
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

  const { data: isFederatedLogin } = flagsHooks.useFlag<boolean | undefined>(
    FlagId.FEDERATED_LOGIN_ENABLED,
  );

  const { data: isAnalyticsEnabled } = flagsHooks.useFlag<boolean | undefined>(
    FlagId.ANALYTICS_ENABLED,
  );
  const hasAnalyticsPrivileges =
    authenticationSession.getUserHasAnalyticsPrivileges();

  const routes = [
    {
      path: 'flows',
      element: (
        <RouteWrapper pageHeader={<FlowsPageHeader title={t('Workflows')} />}>
          <OpsErrorBoundary>
            <PageTitle title="Workflows">
              <FlowsPage />
            </PageTitle>
          </OpsErrorBoundary>
        </RouteWrapper>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: 'flows/:flowId',
      element: (
        <OpsErrorBoundary>
          <PageTitle title="Builder">
            <FlowBuilderPage />
          </PageTitle>
        </OpsErrorBoundary>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: 'runs/:runId',
      element: (
        <OpsErrorBoundary>
          <PageTitle title="Workflow Run">
            <FlowRunPage />
          </PageTitle>
        </OpsErrorBoundary>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: 'runs',
      element: (
        <RouteWrapper pageHeader={<PageHeader title={t('Workflow Runs')} />}>
          <OpsErrorBoundary>
            <PageTitle title="Runs">
              <FlowRunsPage />
            </PageTitle>
          </OpsErrorBoundary>
        </RouteWrapper>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: 'connections',
      element: (
        <ConnectionsProvider>
          <RouteWrapper pageHeader={<ConnectionsHeader />}>
            <OpsErrorBoundary>
              <PageTitle title="Connections">
                <AppConnectionsPage />
              </PageTitle>
            </OpsErrorBoundary>
          </RouteWrapper>
        </ConnectionsProvider>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: 'settings',
      element: (
        <RouteWrapper pageHeader={<PageHeader title={t('Settings')} />}>
          <OpsErrorBoundary>
            <SettingsRerouter />
          </OpsErrorBoundary>
        </RouteWrapper>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: 'settings/appearance',
      element: (
        <RouteWrapper pageHeader={<PageHeader title={t('Settings')} />}>
          <ProjectSettingsLayout>
            <OpsErrorBoundary>
              <PageTitle title="Appearance">
                <AppearancePage />
              </PageTitle>
            </OpsErrorBoundary>
          </ProjectSettingsLayout>
        </RouteWrapper>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: 'settings/general',
      element: (
        <RouteWrapper pageHeader={<PageHeader title={t('Settings')} />}>
          <ProjectSettingsLayout>
            <OpsErrorBoundary>
              <PageTitle title="General">
                <GeneralPage />
              </PageTitle>
            </OpsErrorBoundary>
          </ProjectSettingsLayout>
        </RouteWrapper>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: 'settings/blocks',
      element: (
        <RouteWrapper pageHeader={<PageHeader title={t('Settings')} />}>
          <ProjectSettingsLayout>
            <OpsErrorBoundary>
              <PageTitle title="Blocks">
                <ProjectBlocksPage />
              </PageTitle>
            </OpsErrorBoundary>
          </ProjectSettingsLayout>
        </RouteWrapper>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: 'tables',
      element: (
        <RouteWrapper
          useEntireInnerViewport
          pageHeader={<PageHeader title={t('Tables')} />}
        >
          <PageTitle title="Tables">
            <OpenOpsTablesPage />
          </PageTitle>
        </RouteWrapper>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    ...(isAnalyticsEnabled && hasAnalyticsPrivileges
      ? [
          {
            path: 'analytics',
            element: (
              <RouteWrapper useEntireInnerViewport>
                <OpsErrorBoundary>
                  <PageTitle title="Analytics">
                    <OpenOpsAnalyticsPage />
                  </PageTitle>
                </OpsErrorBoundary>
              </RouteWrapper>
            ),
            errorElement: <RouteErrorBoundary />,
          },
        ]
      : []),
    {
      path: '404',
      element: (
        <OpsErrorBoundary>
          <PageTitle title="Not Found">
            <NotFoundPage />
          </PageTitle>
        </OpsErrorBoundary>
      ),
      errorElement: <RouteErrorBoundary />,
    },
  ];

  if (!isFederatedLogin) {
    const regularLoginRoutes = [
      {
        path: 'forget-password',
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
        path: 'reset-password',
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
        path: 'sign-in',
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
        path: 'verify-email',
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
        path: 'sign-up',
        element: (
          <OpsErrorBoundary>
            <PageTitle title="Sign Up">
              <SignUpPage />
            </PageTitle>
          </OpsErrorBoundary>
        ),
        errorElement: <RouteErrorBoundary />,
      },
    ];
    routes.push(...regularLoginRoutes);
  }

  const redirectRoutes = [
    {
      path: 'redirect',
      element: <RedirectPage></RedirectPage>,
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '*',
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
  routes.push(...redirectRoutes);

  if (isCloudConnectionPageEnabled) {
    const CloudConnectionPage = lazy(
      () => import('@/app/routes/cloud-connection'),
    );
    const CloudLogoutPage = lazy(
      () => import('@/app/routes/cloud-connection/cloud-logout-page'),
    );

    routes.push({
      path: 'connect',
      element: (
        <Suspense>
          <CloudConnectionPage />
        </Suspense>
      ),
      errorElement: <RouteErrorBoundary />,
    });
    routes.push({
      path: 'oauth/callback',
      element: (
        <Suspense>
          <CloudConnectionPage />
        </Suspense>
      ),
      errorElement: <RouteErrorBoundary />,
    });
    routes.push({
      path: 'oauth/logout',
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
      path: '',
      element: (
        <RouteWrapper
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
        </RouteWrapper>
      ),
      errorElement: <RouteErrorBoundary />,
    });
  } else {
    routes.push({
      path: '',
      element: (
        <RouteWrapper pageHeader={<HomeDemoPageHeader />}>
          <OpsErrorBoundary>
            <PageTitle title="Home">
              <HomeDemoPage />
            </PageTitle>
          </OpsErrorBoundary>
        </RouteWrapper>
      ),
      errorElement: <RouteErrorBoundary />,
    });
  }

  routes.push({
    path: 'settings/ai',
    element: (
      <RouteWrapper pageHeader={<PageHeader title={t('Settings')} />}>
        <ProjectSettingsLayout>
          <OpsErrorBoundary>
            <PageTitle title="AI providers">
              <AiSettingsPage />
            </PageTitle>
          </OpsErrorBoundary>
        </ProjectSettingsLayout>
      </RouteWrapper>
    ),
    errorElement: <RouteErrorBoundary />,
  });

  return routes;
};

const ApplicationRouter = () => {
  const router = createBrowserRouter([
    {
      path: '/',
      element: <GlobalLayout />,
      children: createRoutes(),
    },
  ]);
  return <RouterProvider router={router}></RouterProvider>;
};

export { ApplicationRouter };
