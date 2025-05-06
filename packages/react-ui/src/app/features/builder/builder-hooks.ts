import {
  AI_CHAT_CONTAINER_SIZES,
  INTERNAL_ERROR_TOAST,
  toast,
} from '@openops/components/ui';
import { useMutation } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { create, StateCreator, useStore } from 'zustand';
import { devtools } from 'zustand/middleware';

import { flowsApi } from '@/app/features/flows/lib/flows-api';
import {
  Flow,
  FlowOperationRequest,
  FlowOperationType,
  FlowRun,
  FlowVersion,
  FlowVersionState,
  isNil,
  TriggerType,
} from '@openops/shared';
import { flowRunUtils } from '../flow-runs/lib/flow-run-utils';
import {
  BuilderInitialState,
  BuilderState,
  InsertMentionHandler,
  LeftSideBarType,
  MidpanelAction,
  MidpanelState,
  RightSideBarType,
} from './builder-types';
import { DataSelectorSizeState } from './data-selector/data-selector-size-togglers';
import { updateFlowVersion } from './update-flow-version';

export const BuilderStateContext = createContext<BuilderStore | null>(null);

export function useBuilderStateContext<T>(
  selector: (state: BuilderState) => T,
): T {
  const store = useContext(BuilderStateContext);
  if (!store)
    throw new Error('Missing BuilderStateContext.Provider in the tree');
  return useStore(store, selector);
}

const noopStore = {
  getState: () => ({}),
  setState: () => {},
  subscribe: () => () => {},
};

export function useSafeBuilderStateContext<T>(
  selector: (state: BuilderState) => T,
): T | undefined {
  const store = useContext(BuilderStateContext) ?? noopStore;
  const result = useStore(store, selector);

  if (store === noopStore) return undefined;
  return result;
}

export type BuilderStore = ReturnType<typeof createBuilderStore>;
export const createBuilderStore = (initialState: BuilderInitialState) =>
  create<BuilderState>(
    devtools(
      (set) => ({
        flow: initialState.flow,
        flowVersion: initialState.flowVersion,
        loopsIndexes: initialState.run
          ? flowRunUtils.findLoopsState(
              initialState.flowVersion,
              initialState.run,
              {},
            )
          : {},
        leftSidebar: getLeftSidebarInitialState(
          initialState.run,
          initialState.readonly,
        ),
        readonly: initialState.readonly,
        run: initialState.run,
        saving: false,
        selectedStep: initialState.run
          ? initialState.flowVersion.trigger.name
          : null,
        canExitRun: initialState.canExitRun,
        activeDraggingStep: null,
        rightSidebar: initialState.run
          ? RightSideBarType.BLOCK_SETTINGS
          : RightSideBarType.NONE,
        refreshBlockFormSettings: false,

        removeStepSelection: () =>
          set(
            { selectedStep: null, rightSidebar: RightSideBarType.NONE },
            false,
            'removeStepSelection',
          ),
        setActiveDraggingStep: (stepName: string | null) =>
          set(
            (state) => ({
              activeDraggingStep: stepName,
              selectedStep: stepName ?? state.selectedStep,
            }),
            false,
            'setActiveDraggingStep',
          ),
        setReadOnly: (readonly: boolean) =>
          set({ readonly }, false, 'setReadOnly'),
        renameFlowClientSide: (newName: string) => {
          set(
            (state) => {
              return {
                flowVersion: {
                  ...state.flowVersion,
                  displayName: newName,
                },
              };
            },
            false,
            'renameFlowClientSide',
          );
        },
        selectStepByName: (stepName: string, openRightSideBar = true) => {
          set(
            (state) => {
              if (
                stepName === 'trigger' &&
                state.flowVersion.trigger.type === TriggerType.EMPTY
              ) {
                return {
                  selectedStep: stepName,
                  rightSidebar: RightSideBarType.NONE,
                  leftSidebar: getLeftSidebarOnSelectStep(state),
                };
              } else if (
                stepName === 'trigger' &&
                state.flowVersion.trigger.type === TriggerType.BLOCK
              ) {
                return {
                  selectedStep: stepName,
                  rightSidebar: RightSideBarType.BLOCK_SETTINGS,
                  leftSidebar: getLeftSidebarOnSelectStep(state),
                };
              }

              return {
                selectedStep: stepName,
                rightSidebar: openRightSideBar
                  ? RightSideBarType.BLOCK_SETTINGS
                  : RightSideBarType.NONE,
                leftSidebar: getLeftSidebarOnSelectStep(state),
                midpanelState: {
                  ...state.midpanelState,
                  showAiChat: false,
                  aiChatProperty: undefined,
                },
              };
            },
            false,
            'selectStepByName',
          );
        },
        moveToFolderClientSide: (folderId: string) => {
          set(
            (state) => {
              return {
                flow: {
                  ...state.flow,
                  folderId,
                },
              };
            },
            false,
            'moveToFolderClientSide',
          );
        },
        setFlow: (flow: Flow) => set({ flow }, false, 'setFlow'),
        exitRun: () =>
          set(
            {
              run: null,
              readonly: false,
              loopsIndexes: {},
              leftSidebar: LeftSideBarType.NONE,
            },
            false,
            'exitRun',
          ),
        exitStepSettings: () =>
          set(
            {
              rightSidebar: RightSideBarType.NONE,
              selectedStep: null,
            },
            false,
            'exitStepSettings',
          ),
        exitBlockSelector: () =>
          set(
            {
              rightSidebar: RightSideBarType.NONE,
            },
            false,
            'exitBlockSelector',
          ),
        setRightSidebar: (rightSidebar: RightSideBarType) =>
          set({ rightSidebar }, false, 'setRightSidebar'),
        setLeftSidebar: (leftSidebar: LeftSideBarType) =>
          set({ leftSidebar }, false, 'setLeftSidebar'),
        setRun: async (run: FlowRun, flowVersion: FlowVersion) =>
          set(
            (state) => {
              return {
                loopsIndexes: flowRunUtils.findLoopsState(
                  flowVersion,
                  run,
                  state.loopsIndexes,
                ),
                run,
                flowVersion,
                leftSidebar: LeftSideBarType.RUN_DETAILS,
                rightSidebar: RightSideBarType.BLOCK_SETTINGS,
                selectedStep: run.steps
                  ? flowRunUtils.findFailedStep(run) ??
                    state.selectedStep ??
                    'trigger'
                  : 'trigger',
                readonly: true,
              };
            },
            false,
            'setRun',
          ),
        startSaving: () => set({ saving: true }, false, 'startSaving'),
        setLoopIndex: (stepName: string, index: number) => {
          set(
            (state) => {
              return {
                loopsIndexes: {
                  ...state.loopsIndexes,
                  [stepName]: index,
                },
              };
            },
            false,
            'setLoopIndex',
          );
        },
        applyOperation: (
          operation: FlowOperationRequest,
          onError: () => void,
        ) =>
          set(
            (state) => {
              if (state.readonly) {
                console.warn('Cannot apply operation while readonly');
                return state;
              }
              return updateFlowVersion(state, operation, onError, set);
            },
            false,
            'applyOperation',
          ),
        setVersion: (flowVersion: FlowVersion) => {
          set(
            (state) => ({
              flowVersion,
              run: null,
              readonly:
                state.flow.publishedVersionId !== flowVersion.id &&
                flowVersion.state === FlowVersionState.LOCKED,
              leftSidebar: LeftSideBarType.NONE,
            }),
            false,
            'setVersion',
          );
        },
        setVersionUpdateTimestamp: (updateTimestamp: string) => {
          set(
            (state) => ({
              flowVersion: {
                ...state.flowVersion,
                updated: updateTimestamp,
              },
            }),
            false,
            'setVersionUpdateTimestamp',
          );
        },
        insertMention: null,
        setInsertMentionHandler: (
          insertMention: InsertMentionHandler | null,
        ) => {
          set({ insertMention }, false, 'setInsertMentionHandler');
        },
        refreshSettings: () =>
          set(
            (state) => ({
              refreshBlockFormSettings: !state.refreshBlockFormSettings,
            }),
            false,
            'refreshSettings',
          ),
        canUndo: false,
        setCanUndo: (canUndo: boolean) =>
          set(
            {
              canUndo,
            },
            false,
            'setCanUndo',
          ),
        canRedo: false,
        setCanRedo: (canRedo: boolean) =>
          set(
            {
              canRedo,
            },
            false,
            'setCanRedo',
          ),
        dynamicPropertiesAuthReconnectCounter: 0,
        refreshDynamicPropertiesForAuth: () =>
          set(
            (state) => ({
              dynamicPropertiesAuthReconnectCounter:
                state.dynamicPropertiesAuthReconnectCounter + 1,
            }),
            false,
            'refreshDynamicProperties',
          ),
        midpanelState: {
          showDataSelector: false,
          dataSelectorSize: DataSelectorSizeState.DOCKED,
          showAiChat: false,
          aiChatProperty: undefined,
          aiContainerSize: AI_CHAT_CONTAINER_SIZES.COLLAPSED,
        },
        applyMidpanelAction: (midpanelAction: MidpanelAction) =>
          set(
            (state) => applyMidpanelAction(state, midpanelAction),
            false,
            'applyMidpanelAction',
          ),
      }),
      {
        enabled: process.env.NODE_ENV !== 'production',
      },
    ) as StateCreator<BuilderState>,
  );

export const useSwitchToDraft = () => {
  const [flowVersion, setVersion, exitRun] = useBuilderStateContext((state) => [
    state.flowVersion,
    state.setVersion,
    state.exitRun,
  ]);

  const { mutate: switchToDraft, isPending: isSwitchingToDraftPending } =
    useMutation({
      mutationFn: async () => {
        const flow = await flowsApi.get(flowVersion.flowId);
        return flow;
      },
      onSuccess: (flow) => {
        setVersion(flow.version);
        exitRun();
      },
      onError: () => {
        toast(INTERNAL_ERROR_TOAST);
      },
    });
  return {
    switchToDraft,
    isSwitchingToDraftPending,
  };
};

const getLeftSidebarOnSelectStep = (state: BuilderState): LeftSideBarType => {
  if (!isNil(state.run)) {
    return LeftSideBarType.RUN_DETAILS;
  }
  if (state.leftSidebar === LeftSideBarType.TREE_VIEW) {
    return LeftSideBarType.TREE_VIEW;
  }
  return LeftSideBarType.NONE;
};

const getLeftSidebarInitialState = (run: FlowRun | null, readonly: boolean) => {
  if (readonly) {
    return run ? LeftSideBarType.RUN_DETAILS : LeftSideBarType.MENU;
  }
  return LeftSideBarType.NONE;
};

/*
  Only a subset of FlowOperationRequest types are meant to be pushed to the undo history.
*/
export type UndoHistoryRelevantFlowOperationRequest = Extract<
  FlowOperationRequest,
  {
    type:
      | FlowOperationType.MOVE_ACTION
      | FlowOperationType.DELETE_ACTION
      | FlowOperationType.UPDATE_TRIGGER
      | FlowOperationType.UPDATE_ACTION
      | FlowOperationType.DUPLICATE_ACTION
      | FlowOperationType.ADD_ACTION
      | FlowOperationType.PASTE_ACTIONS;
  }
>;

const applyMidpanelAction = (state: BuilderState, action: MidpanelAction) => {
  let newMidpanelState: Partial<MidpanelState>;
  const oldDataSelectorSize = state.midpanelState.dataSelectorSize;
  const oldShowAiChat = state.midpanelState.showAiChat;

  switch (action.type) {
    case 'FOCUS_INPUT_WITH_MENTIONS':
      newMidpanelState = {
        showDataSelector: true,
        dataSelectorSize: oldShowAiChat
          ? DataSelectorSizeState.DOCKED
          : oldDataSelectorSize,
        aiContainerSize: AI_CHAT_CONTAINER_SIZES.COLLAPSED,
      };
      break;
    case 'DATASELECTOR_MIMIZE_CLICK':
      newMidpanelState = {
        dataSelectorSize: DataSelectorSizeState.COLLAPSED,
        aiContainerSize: AI_CHAT_CONTAINER_SIZES.DOCKED,
      };
      break;
    case 'DATASELECTOR_DOCK_CLICK':
      newMidpanelState = {
        dataSelectorSize: DataSelectorSizeState.DOCKED,
        aiContainerSize: AI_CHAT_CONTAINER_SIZES.COLLAPSED,
      };
      break;
    case 'DATASELECTOR_EXPAND_CLICK':
      newMidpanelState = {
        dataSelectorSize: DataSelectorSizeState.EXPANDED,
        aiContainerSize: AI_CHAT_CONTAINER_SIZES.COLLAPSED,
      };
      break;
    case 'AICHAT_CLOSE_CLICK':
      newMidpanelState = {
        showAiChat: false,
        aiChatProperty: undefined,
        dataSelectorSize: DataSelectorSizeState.DOCKED,
      };
      break;
    case 'AICHAT_MIMIZE_CLICK':
      newMidpanelState = {
        aiContainerSize: AI_CHAT_CONTAINER_SIZES.COLLAPSED,
        dataSelectorSize: state.midpanelState.dataSelectorSize,
      };
      break;
    case 'AICHAT_DOCK_CLICK':
      newMidpanelState = {
        aiContainerSize: AI_CHAT_CONTAINER_SIZES.DOCKED,
        dataSelectorSize: DataSelectorSizeState.COLLAPSED,
      };
      break;
    case 'AICHAT_EXPAND_CLICK':
      newMidpanelState = {
        aiContainerSize: AI_CHAT_CONTAINER_SIZES.EXPANDED,
        dataSelectorSize: DataSelectorSizeState.COLLAPSED,
      };
      break;
    case 'PANEL_CLICK_AWAY':
      newMidpanelState = {
        showDataSelector: false,
        aiContainerSize: AI_CHAT_CONTAINER_SIZES.DOCKED,
      };
      break;
    case 'GENERATE_WITH_AI_CLICK':
      newMidpanelState = {
        showAiChat: true,
        aiContainerSize: AI_CHAT_CONTAINER_SIZES.DOCKED,
        dataSelectorSize: DataSelectorSizeState.COLLAPSED,
        aiChatProperty: action.property,
      };
      break;
    case 'ADD_CODE_TO_INJECT':
      newMidpanelState = {
        ...state.midpanelState,
        codeToInject: action.code,
      };
      break;
    case 'CLEAN_CODE_TO_INJECT':
      newMidpanelState = {
        ...state.midpanelState,
        codeToInject: undefined,
      };
      break;
    default:
      newMidpanelState = state.midpanelState;
      break;
  }
  return {
    midpanelState: { ...state.midpanelState, ...newMidpanelState },
  };
};
