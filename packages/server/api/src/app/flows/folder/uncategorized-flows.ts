import {
  ApplicationError,
  ContentType,
  ErrorCode,
  PopulatedFlow,
} from '@openops/shared';
import { flowRepo } from '../flow/flow.repo';
import { flowService } from '../flow/flow.service';

export const getUncategorizedFlows = async (
  projectId: string,
  contentType: ContentType,
): Promise<PopulatedFlow[]> => {
  let flowFilterCondition: string;
  let flowFilterParams: Record<string, unknown>;

  if (contentType === ContentType.WORKFLOW) {
    const result = await flowService.getFilterCondition();
    flowFilterCondition = result.flowFilterCondition;
    flowFilterParams = result.flowFilterParams;
  } else {
    throw new ApplicationError({
      code: ErrorCode.VALIDATION,
      params: { message: 'Invalid content type' },
    });
  }

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
