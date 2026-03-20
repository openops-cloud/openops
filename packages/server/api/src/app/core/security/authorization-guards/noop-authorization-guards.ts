import {
  CreateStepRunRequestBody,
  Principal,
  TestFlowRunRequestBody,
} from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { AuthorizationGuards } from './authorization-guards';

export const noopAuthorizationGuards: AuthorizationGuards = {
  enforceTestRunAuthorization(
    _data: TestFlowRunRequestBody,
    _principal: Principal,
  ): Promise<void> {
    return Promise.resolve();
  },

  enforceTestStepAuthorization(
    _data: CreateStepRunRequestBody,
    _principal: Principal,
  ): Promise<void> {
    return Promise.resolve();
  },

  enforceTestStepAuthorizationFromRequest(
    _request: FastifyRequest,
  ): Promise<void> {
    return Promise.resolve();
  },

  enforceWorkflowStatusAuthorization(_request: FastifyRequest): Promise<void> {
    return Promise.resolve();
  },
};
