import {
  AppSystemProp,
  flowTimeoutSandbox,
  networkUtls,
  SharedSystemProp,
  system,
  webhookSecretsUtils,
} from '@openops/server-shared';
import { Flag, FlagId, isNil } from '@openops/shared';
import axios from 'axios';
import { webhookUtils } from 'server-worker';
import { repoFactory } from '../core/db/repo-factory';
import { FlagEntity } from './flag.entity';
import { defaultTheme } from './theme';

const flagRepo = repoFactory(FlagEntity);

let cachedVersion: string | undefined;

export const flagService = {
  save: async (flag: FlagType): Promise<Flag> => {
    return flagRepo().save({
      id: flag.id,
      value: flag.value,
    });
  },
  async getOne(flagId: FlagId): Promise<Flag | null> {
    return flagRepo().findOneBy({
      id: flagId,
    });
  },
  async getAll(): Promise<Flag[]> {
    const flags = await flagRepo().find({});
    const now = new Date().toISOString();
    const created = now;
    const updated = now;
    const latestVersion = await this.getLatestRelease();
    flags.push(
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
        id: FlagId.CODE_COPILOT_ENABLED,
        value: !isNil(system.get(AppSystemProp.OPENAI_API_KEY)),
        created,
        updated,
      },
      {
        id: FlagId.HTTP_REQUEST_COPILOT_ENABLED,
        value:
          !isNil(system.get(AppSystemProp.OPENAI_API_KEY)) &&
          !isNil(system.get(AppSystemProp.RAPID_API_KEY)),
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
        value: latestVersion,
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
        value: await this.getBackendRedirectUrl(),
        created,
        updated,
      },
    );

    return flags;
  },
  async getBackendRedirectUrl(): Promise<string> {
    let backendUrl = await networkUtls.getPublicUrl();

    // The public url can have api suffix if the api is exposed through a gateway
    backendUrl = backendUrl.replace('api/', '');

    return `${backendUrl}redirect`;
  },
  async getCurrentRelease(): Promise<string> {
    const packageJson = await import('package.json');
    return packageJson.version;
  },
  async getLatestRelease(): Promise<string> {
    try {
      if (cachedVersion) {
        return cachedVersion;
      }
      const response = await axios.get<PackageJson>(
        'https://raw.githubusercontent.com/openops-cloud/openops/main/package.json',
        {
          timeout: 5000,
        },
      );
      cachedVersion = response.data.version;
      return response.data.version;
    } catch (ex) {
      return '0.0.0';
    }
  },
  isCloudOrganization(organizationId: string | null): boolean {
    const cloudOrganizationId = system.get(AppSystemProp.CLOUD_ORGANIZATION_ID);
    if (!cloudOrganizationId || !organizationId) {
      return false;
    }
    return organizationId === cloudOrganizationId;
  },
};

export type FlagType =
  | BaseFlagStructure<FlagId.FRONTEND_URL, string>
  | BaseFlagStructure<FlagId.WEBHOOK_URL_PREFIX, string>;

type BaseFlagStructure<K extends FlagId, V> = {
  id: K;
  value: V;
};

type PackageJson = {
  version: string;
};
