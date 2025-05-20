import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { logger } from '@openops/server-shared';
import {
  CreateStepRunRequestBody,
  FlowRunStatus,
  StepRunResponse,
  TestFlowRunRequestBody,
  WebsocketClientEvent,
  WebsocketServerEvent,
} from '@openops/shared';
import { sendStepFailureEvent } from '../telemetry/event-models/step';
import { sendWorkflowTestFailureEvent } from '../telemetry/event-models/workflow';
import {
  getPrincipalFromWebsocket,
  websocketService,
} from '../websockets/websockets.service';
import { flowWorkerController } from '../workers/worker-controller';
import { flowRunService } from './flow-run/flow-run-service';
import { flowVersionController } from './flow/flow-version.controller';
import { flowController } from './flow/flow.controller';
import { stepRunService } from './step-run/step-run-service';
import { testTriggerController } from './test-trigger/test-trigger-controller';

export const flowModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(flowWorkerController, { prefix: '/v1/worker/flows' });
  await app.register(flowVersionController, { prefix: '/v1/flow-versions' });
  await app.register(flowController, { prefix: '/v1/flows' });
  await app.register(testTriggerController, { prefix: '/v1/test-trigger' });
  websocketService.addListener(WebsocketServerEvent.TEST_FLOW_RUN, (socket) => {
    return async (data: TestFlowRunRequestBody) => {
      let principal;
      try {
        principal = await getPrincipalFromWebsocket(socket);

        const flowRun = await flowRunService.test({
          projectId: principal.projectId,
          flowVersionId: data.flowVersionId,
        });

        logger.debug(
          `Flow execution was manually started. FlowId: ${flowRun.flowId}`,
          {
            userId: principal.id,
            flowRunId: flowRun.id,
            flowId: flowRun.flowId,
            flowVersionId: data.flowVersionId,
          },
        );
        socket.emit(WebsocketClientEvent.TEST_FLOW_RUN_STARTED, flowRun);
      } catch (err) {
        sendWorkflowTestFailureEvent({
          userId: principal?.id ?? '',
          projectId: principal?.projectId ?? '',
          flowVersionId: data.flowVersionId,
          errorMessage: (err as Error).message,
        });

        logger.error('Something went wrong when handling the FLOW_RUN event.', {
          message: (err as Error).message,
        });
        socket.emit('error', {
          flowVersionId: data.flowVersionId,
          status: FlowRunStatus.FAILED,
          success: false,
          output: (err as Error).message,
        });
      }
    };
  });
  websocketService.addListener(WebsocketServerEvent.TEST_STEP_RUN, (socket) => {
    return async (data: CreateStepRunRequestBody) => {
      let principal;
      try {
        principal = await getPrincipalFromWebsocket(socket);

        logger.debug({ data }, '[Socket#testStepRun]');
        const stepRun = await stepRunService.create({
          userId: principal.id,
          projectId: principal.projectId,
          flowVersionId: data.flowVersionId,
          stepName: data.stepName,
        });
        const response: StepRunResponse = {
          id: data.id,
          success: stepRun.success,
          output: stepRun.output,
        };
        socket.emit(WebsocketClientEvent.TEST_STEP_FINISHED, response);
      } catch (err) {
        sendStepFailureEvent({
          userId: principal?.id ?? '',
          projectId: principal?.projectId ?? '',
          stepName: data.stepName,
          errorMessage: (err as Error).message,
        });

        logger.error('Something went wrong when handling the STEP_RUN event.', {
          message: (err as Error).message,
        });
        socket.emit('error', {
          id: data.id,
          success: false,
          output: (err as Error).message,
        });
      }
    };
  });
};
