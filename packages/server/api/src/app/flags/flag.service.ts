import { AppSystemProp, networkUtls, system } from '@openops/server-shared';
import { Flag, FlagId } from '@openops/shared';
import axios from 'axios';
import { repoFactory } from '../core/db/repo-factory';
import { FlagEntity } from './flag.entity';
import { getInMemoryFlags } from './in-memory-flags';

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

    const inMemoryFlags = await getInMemoryFlags();

    flags.push(...inMemoryFlags);

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
