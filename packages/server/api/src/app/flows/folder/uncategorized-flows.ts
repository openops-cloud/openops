import { ContentType, PopulatedFlow } from '@openops/shared';
import { flowRepo } from '../flow/flow.repo';
import { getFlowFilter } from './flow-filter-util';

export const getUncategorizedFlows = async (
  projectId: string,
  contentType: ContentType,
): Promise<PopulatedFlow[]> => {
  const { condition: flowFilterCondition, params: flowFilterParams } =
    await getFlowFilter(projectId, contentType);

  const qb = flowRepo()
    .createQueryBuilder('flows')
    .select(['flows.id', 'flows.projectId'])
    .leftJoinAndMapOne(
      'flows.version',
      'flow_version',
      'version',
      `version.flowId = flows.id
         AND version.id IN (
            SELECT fv.id
            FROM flow_version fv
            WHERE fv."flowId" = flows.id
            ORDER BY fv.created DESC
            LIMIT 1
        )`,
    )
    .addSelect(['version.displayName'])
    .where('flows.folderId IS NULL')
    .andWhere('flows.projectId = :projectId', { projectId })
    .andWhere(flowFilterCondition, flowFilterParams)
    .orderBy('flows.updated', 'DESC');

  return qb.getMany() as unknown as PopulatedFlow[];
};
