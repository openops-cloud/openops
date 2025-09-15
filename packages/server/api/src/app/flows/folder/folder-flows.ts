import { ContentType } from '@openops/shared';
import { getFlowFilter } from './flow-filter-util';
import { FolderWithFlows } from './folder-tree.utils';
import { folderRepo } from './folder.service';
export const getFolderFlows = async (
  projectId: string,
  contentType: ContentType,
): Promise<FolderWithFlows[]> => {
  const { condition: flowFilterCondition, params: flowFilterParams } =
    await getFlowFilter(projectId, contentType);

  const qb = folderRepo()
    .createQueryBuilder('folder')
    .loadRelationCountAndMap('folder.numberOfFlows', 'folder.flows')
    .leftJoinAndSelect('folder.parentFolder', 'parentFolder')
    .leftJoinAndSelect(
      'folder.flows',
      'flows',
      `flows.id IN (
        SELECT f.id
        FROM flow f
        WHERE f."folderId" = folder.id
        ORDER BY f.updated DESC
        LIMIT 100
      ) AND ${flowFilterCondition}`,
      flowFilterParams,
    )
    .leftJoinAndMapOne(
      'flows.version',
      'flow_version',
      'flowVersion',
      `flowVersion.id IN (
        SELECT fv.id
        FROM (
          SELECT "id", "flowId", "created", "displayName"
          FROM flow_version
          WHERE "flowId" = flows.id
          ORDER BY created DESC
          LIMIT 1
        ) fv
      )`,
    )
    .where('folder."projectId" = :projectId', { projectId })
    .andWhere('folder."contentType" = :contentType', { contentType })
    .orderBy('folder."displayName"', 'ASC');

  return (await qb.getMany()) as FolderWithFlows[];
};
