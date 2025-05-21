import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { logger } from '@openops/server-shared';
import {
  CreateStepRunRequestBody,
  FlowRunStatus,
  StepRunResponse,
  TestFlowRunRequestBody,
  WebsocketClientEvent,
  WebsocketServerEvent,
  flowHelper,
} from '@openops/shared';
import { sendStepFailureEvent } from '../telemetry/event-models/step';
import {
  sendWorkflowTestFailureEvent,
  sendWorkflowTestRunTriggeredEvent,
} from '../telemetry/event-models/workflow';
import {
  getPrincipalFromWebsocket,
  websocketService,
} from '../websockets/websockets.service';
import { flowWorkerController } from '../workers/worker-controller';
import { flowRunService } from './flow-run/flow-run-service';
import { flowVersionService } from './flow-version/flow-version.service';
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
      let flowRun;
      try {
        principal = await getPrincipalFromWebsocket(socket);

        flowRun = await flowRunService.test({
          projectId: principal.projectId,
          flowVersionId: data.flowVersionId,
        });

        sendWorkflowTestRunTriggeredEvent({
          projectId: principal.id,
          userId: principal.projectId,
          flowVersionId: data.flowVersionId,
          flowId: flowRun.flowId,
          flowRunId: flowRun.id,
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
          flowId: flowRun?.flowId ?? '',
          flowRunId: flowRun?.id ?? '',
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
        let step;
        try {
          const flowVersion = await flowVersionService.getOneOrThrow(
            data.flowVersionId,
          );
          step = flowHelper.getStep(flowVersion, data.stepName);
        } catch (err) {
          logger.error('Something went wrong when getting the step.', {
            message: (err as Error).message,
          });
        }

        sendStepFailureEvent({
          userId: principal?.id ?? '',
          projectId: principal?.projectId ?? '',
          stepName: data.stepName,
          stepType: step?.type ?? '',
          blockName: step?.settings?.blockName ?? '',
          actionName: step?.settings?.actionName ?? '',
          flowVersionId: data.flowVersionId,
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
