import { aiChatApi } from '@/app/features/builder/ai-chat/lib/chat-api';
import { PromiseQueue } from '@/app/lib/promise-queue';
import {
  flowHelper,
  FlowOperationRequest,
  FlowOperationType,
  FlowVersion,
} from '@openops/shared';
import { flowsApi } from '../flows/lib/flows-api';
import { BuilderState, RightSideBarType } from './builder-types';
import { stepTestOutputCache } from './data-selector/data-selector-cache';

const flowUpdatesQueue = new PromiseQueue();

export const updateFlowVersion = (
  state: BuilderState,
  operation: FlowOperationRequest,
  onError: () => void,
  set: (
    partial:
      | BuilderState
      | Partial<BuilderState>
      | ((state: BuilderState) => BuilderState | Partial<BuilderState>),
    replace?: boolean | undefined,
  ) => void,
) => {
  const newFlowVersion = flowHelper.apply(state.flowVersion, operation);
  if (operation.type === FlowOperationType.DELETE_ACTION) {
    const stepToClear = flowHelper.getStep(
      state.flowVersion,
      operation.request.name,
    );

    if (stepToClear) {
      stepTestOutputCache.clearStep(stepToClear.id!);
    }

    if (operation.request.name === state.selectedStep) {
      set({ selectedStep: undefined });
      set({ rightSidebar: RightSideBarType.NONE });
      deleteChatRequest(state.flowVersion, operation.request.name);
    }
  }

  if (operation.type === FlowOperationType.DUPLICATE_ACTION) {
    set({
      selectedStep: flowHelper.getStep(
        newFlowVersion,
        operation.request.stepName,
      )?.nextAction?.name,
    });
  }

  const updateRequest = async () => {
    set({ saving: true });
    try {
      const updatedFlowVersion = await flowsApi.update(
        state.flow.id,
        operation,
      );
      set((state) => {
        return {
          flowVersion: {
            ...state.flowVersion,
            id: updatedFlowVersion.version.id,
            state: updatedFlowVersion.version.state,
            updated: updatedFlowVersion.version.updated,
            testRunActionLimits: updatedFlowVersion.version.testRunActionLimits,
          },
          saving: flowUpdatesQueue.size() !== 0,
        };
      });
    } catch (error) {
      console.error(error);
      flowUpdatesQueue.halt();
      onError();
    }
  };
  flowUpdatesQueue.add(updateRequest);
  return { flowVersion: newFlowVersion };
};

async function deleteChatRequest(flowVersion: FlowVersion, stepName: string) {
  try {
    const stepDetails = flowHelper.getStep(flowVersion, stepName);
    const blockName = stepDetails?.settings?.blockName;
    const actionName = stepDetails?.settings?.actionName;

    if (!stepDetails?.id) {
      return;
    }

    const chat = await aiChatApi.open(
      flowVersion.flowId,
      blockName,
      stepDetails.id,
      actionName,
    );
    await aiChatApi.delete(chat.chatId);
  } catch (err) {
    console.error(err);
  }
}
