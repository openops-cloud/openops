import { PromiseQueue } from '@/app/lib/promise-queue';
import {
  flowHelper,
  FlowOperationRequest,
  FlowOperationType,
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
