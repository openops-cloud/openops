import { logger } from '@openops/server-shared';
import {
  openOpsId,
  ProjectId,
  PutStoreEntryRequest,
  sanitizeObjectForPostgresql,
  StoreEntry,
} from '@openops/shared';
import { repoFactory } from '../core/db/repo-factory';
import { StoreEntryEntity } from './store-entry-entity';

const storeEntryRepo = repoFactory<StoreEntry>(StoreEntryEntity);

export const storeEntryService = {
  async upsert({
    projectId,
    request,
  }: {
    projectId: ProjectId;
    request: PutStoreEntryRequest;
  }): Promise<StoreEntry | null> {
    const value = sanitizeObjectForPostgresql(request.value);
    const insertResult = await storeEntryRepo().upsert(
      {
        id: openOpsId(),
        key: request.key,
        value,
        projectId,
      },
      ['projectId', 'key'],
    );

    return {
      projectId,
      key: request.key,
      value,
      id: insertResult.identifiers[0].id,
      created: insertResult.generatedMaps[0].created,
      updated: insertResult.generatedMaps[0].updated,
    };
  },
  async getOne({
    projectId,
    key,
  }: {
    projectId: ProjectId;
    key: string;
  }): Promise<StoreEntry | null> {
    return storeEntryRepo().findOneBy({
      projectId,
      key,
    });
  },
  async delete({
    projectId,
    key,
  }: {
    projectId: ProjectId;
    key: string;
  }): Promise<void> {
    await storeEntryRepo().delete({
      projectId,
      key,
    });
  },

  async list({
    projectId,
    prefix,
    filterRegex,
  }: {
    projectId: ProjectId;
    prefix: string;
    filterRegex?: string;
  }): Promise<Array<{ key: string; value: unknown }>> {
    const query = storeEntryRepo()
      .createQueryBuilder('storeEntry')
      .where('storeEntry.projectId = :projectId', { projectId });

    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.andWhere('storeEntry.key LIKE :prefix', { prefix: `${prefix}%` });

    if (filterRegex) {
      const keyExpression = `REGEXP_REPLACE(REGEXP_REPLACE(storeEntry.key, '^${escapedPrefix}', '', 'g'), '^run_[^/]+/', '', 'g')`;
      query.andWhere(`${keyExpression} ~ :filterRegex`, { filterRegex });
    }

    const entries = await query.getMany();
    return entries.map(({ key, value }) => ({ key, value }));
  },
};
