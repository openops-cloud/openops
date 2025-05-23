import {
  AppSystemProp,
  flowTimeoutSandbox,
  SharedSystemProp,
  system,
  webhookSecretsUtils,
} from '@openops/server-shared';
import { Flag, FlagId } from '@openops/shared';
import { webhookUtils } from 'server-worker';
import { flagService } from './flag.service';
import { defaultTheme } from './theme';

let flags: Flag[];
export async function getInMemoryFlag(
  flagId: FlagId,
): Promise<Flag | undefined> {
  const flags = await getInMemoryFlags();

  return flags.find((flag) => flag.id !== flagId);
}

export async function getInMemoryFlags(): Promise<Flag[]> {
  if (flags) {
    return flags;
  }

  const now = new Date().toISOString();
  const created = now;
  const updated = now;

  flags = [
    {
      id: FlagId.ENVIRONMENT,
      value: system.get(SharedSystemProp.ENVIRONMENT),
      created,
      updated,
    },
    {
      id: FlagId.SHOW_POWERED_BY_IN_FORM,
      value: false,
      created,
      updated,
    },
    {
      id: FlagId.IS_CLOUD_PLATFORM,
      value: false,
      created,
      updated,
    },
    {
      id: FlagId.BLOCKS_SYNC_MODE,
      value: system.get(AppSystemProp.BLOCKS_SYNC_MODE),
      created,
      updated,
    },
    {
      id: FlagId.EXECUTION_DATA_RETENTION_DAYS,
      value: system.getNumber(AppSystemProp.EXECUTION_DATA_RETENTION_DAYS),
      created,
      updated,
    },
    {
      id: FlagId.SHOW_PLATFORM_DEMO,
      value: false,
      created,
      updated,
    },
    {
      id: FlagId.OWN_AUTH2_ENABLED,
      value: true,
      created,
      updated,
    },
    {
      id: FlagId.SHOW_REWARDS,
      value: false,
      created,
      updated,
    },
    {
      id: FlagId.CLOUD_AUTH_ENABLED,
      value: system.getBoolean(AppSystemProp.CLOUD_AUTH_ENABLED) ?? true,
      created,
      updated,
    },
    {
      id: FlagId.PROJECT_LIMITS_ENABLED,
      value: false,
      created,
      updated,
    },
    {
      id: FlagId.SHOW_COPILOTS,
      value: true,
      created,
      updated,
    },
    {
      id: FlagId.INSTALL_PROJECT_BLOCKS_ENABLED,
      value: true,
      created,
      updated,
    },
    {
      id: FlagId.MANAGE_PROJECT_BLOCKS_ENABLED,
      value: false,
      created,
      updated,
    },
    {
      id: FlagId.SHOW_SIGN_UP_LINK,
      value: false,
      created,
      updated,
    },
    {
      id: FlagId.EDITION,
      value: system.getEdition(),
      created,
      updated,
    },
    {
      id: FlagId.SHOW_BILLING,
      value: false,
      created,
      updated,
    },
    {
      id: FlagId.EMAIL_AUTH_ENABLED,
      value: true,
      created,
      updated,
    },
    {
      id: FlagId.THEME,
      value: defaultTheme,
      created,
      updated,
    },
    {
      id: FlagId.SHOW_DOCS,
      value: false,
      created,
      updated,
    },
    {
      id: FlagId.SHOW_COMMUNITY,
      value: false,
      created,
      updated,
    },
    {
      id: FlagId.PRIVATE_BLOCKS_ENABLED,
      value: false,
      created,
      updated,
    },
    {
      id: FlagId.PRIVACY_POLICY_URL,
      value: 'https://www.openops.com/privacy',
      created,
      updated,
    },
    {
      id: FlagId.TERMS_OF_SERVICE_URL,
      value: 'https://www.openops.com/terms',
      created,
      updated,
    },
    {
      id: FlagId.WEBHOOK_URL_PREFIX,
      value: await webhookUtils.getWebhookPrefix(),
      created,
      updated,
    },
    {
      id: FlagId.FRONTEND_URL,
      value: system.get(SharedSystemProp.FRONTEND_URL),
      created,
      updated,
    },
    {
      id: FlagId.FLOW_RUN_TIME_SECONDS,
      value: flowTimeoutSandbox,
      created,
      updated,
    },
    {
      id: FlagId.CURRENT_VERSION,
      value: system.get(SharedSystemProp.VERSION),
      created,
      updated,
    },
    {
      id: FlagId.LATEST_VERSION,
      value: await flagService.getLatestRelease(),
      created,
      updated,
    },
    {
      id: FlagId.SUPPORTED_APP_WEBHOOKS,
      value: webhookSecretsUtils.getSupportedAppWebhooks(),
      created,
      updated,
    },
    {
      id: FlagId.ALLOW_NPM_PACKAGES_IN_CODE_STEP,
      value: true,
      created,
      updated,
    },
    {
      id: FlagId.OPENOPS_TABLES_PUBLIC_URL,
      value: system.get(AppSystemProp.OPENOPS_TABLES_PUBLIC_URL),
      created,
      updated,
    },
    {
      id: FlagId.ANALYTICS_PUBLIC_URL,
      value: system.get(AppSystemProp.ANALYTICS_PUBLIC_URL),
      created,
      updated,
    },
    {
      id: FlagId.DARK_THEME_ENABLED,
      value: system.getBoolean(AppSystemProp.DARK_THEME_ENABLED),
      created,
      updated,
    },
    {
      id: FlagId.SHOW_DURATION,
      value: false,
      created,
      updated,
    },
    {
      id: FlagId.FRONTEGG_URL,
      value: system.get(AppSystemProp.FRONTEGG_URL),
      created,
      updated,
    },
    {
      id: FlagId.FRONTEGG_CLIENT_ID,
      value: system.get(AppSystemProp.FRONTEGG_CLIENT_ID),
      created,
      updated,
    },
    {
      id: FlagId.FRONTEGG_APP_ID,
      value: system.get(AppSystemProp.FRONTEGG_APP_ID),
      created,
      updated,
    },
    {
      id: FlagId.CLOUD_CONNECTION_PAGE_ENABLED,
      value: system.getBoolean(AppSystemProp.CLOUD_CONNECTION_PAGE_ENABLED),
      created,
      updated,
    },
    {
      id: FlagId.SHOW_DEMO_HOME_PAGE,
      value: system.getBoolean(AppSystemProp.SHOW_DEMO_HOME_PAGE),
      created,
      updated,
    },
    {
      id: FlagId.OAUTH_PROXY_URL,
      value: system.get<string>(SharedSystemProp.INTERNAL_OAUTH_PROXY_URL),
      created,
      updated,
    },
    {
      id: FlagId.THIRD_PARTY_AUTH_PROVIDER_REDIRECT_URL,
      value: await flagService.getBackendRedirectUrl(),
      created,
      updated,
    },
    {
      id: FlagId.CANDU_CLIENT_TOKEN,
      value: system.get<string>(AppSystemProp.CANDU_CLIENT_TOKEN),
      created,
      updated,
    },
    {
      id: FlagId.USE_NEW_EXTERNAL_TESTDATA,
      value: true,
      created,
      updated,
    },
  ];

  return flags;
}
