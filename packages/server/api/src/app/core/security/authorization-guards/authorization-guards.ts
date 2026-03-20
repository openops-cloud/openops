import {
  CreateStepRunRequestBody,
  Principal,
  TestFlowRunRequestBody,
} from '@openops/shared';
import { FastifyRequest } from 'fastify';

export type AuthorizationGuards = {
  enforceTestStepAuthorizationFromRequest(
    request: FastifyRequest,
  ): Promise<void>;

  enforceTestStepAuthorization(
    data: CreateStepRunRequestBody,
    principal: Principal,
  ): Promise<void>;

  enforceTestRunAuthorization(
    data: TestFlowRunRequestBody,
    principal: Principal,
  ): Promise<void>;

  enforceWorkflowStatusAuthorization(request: FastifyRequest): Promise<void>;
};
