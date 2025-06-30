import { FlowVersion } from '@openops/shared';
import { FastifyReply } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { flowService } from '../flow/flow.service';

export async function validateFlowVersionBelongsToProject(
  flowVersion: FlowVersion,
  projectId: string,
  reply: FastifyReply,
): Promise<boolean> {
  const flow = await flowService.getOne({
    id: flowVersion.flowId,
    projectId,
  });
  if (flow === null || flow === undefined) {
    await reply.status(StatusCodes.FORBIDDEN).send({
      success: false,
      message: 'The flow and version are not associated with the project',
    });

    return false;
  }

  return true;
}
