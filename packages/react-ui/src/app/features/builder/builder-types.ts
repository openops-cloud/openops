import { BlockProperty } from '@openops/blocks-framework';
import { AiCliChatContainerSizeState } from '@openops/components/ui';
import {
  Flow,
  FlowOperationRequest,
  FlowRun,
  FlowVersion,
} from '@openops/shared';
import { DataSelectorSizeState } from './data-selector/data-selector-size-togglers';

export enum LeftSideBarType {
  RUNS = 'runs',
  VERSIONS = 'versions',
  RUN_DETAILS = 'run-details',
  MENU = 'menu',
  TREE_VIEW = 'tree-view',
  NONE = 'none',
}

export enum RightSideBarType {
  NONE = 'none',
  BLOCK_SETTINGS = 'block-settings',
}

export type InsertMentionHandler = (propertyPath: string) => void;

export type MidpanelState = {
  showDataSelector: boolean;
  dataSelectorSize: DataSelectorSizeState;
  showAiChat: boolean;
  aiContainerSize: AiCliChatContainerSizeState;
  aiChatProperty?: BlockProperty & {
    inputName: `settings.input.${string}`;
  };
  codeToInject?: string;
};

export type MidpanelAction =
  | { type: 'FOCUS_INPUT_WITH_MENTIONS' }
  | { type: 'DATASELECTOR_MIMIZE_CLICK' }
  | { type: 'DATASELECTOR_DOCK_CLICK' }
  | { type: 'DATASELECTOR_EXPAND_CLICK' }
  | { type: 'AICHAT_CLOSE_CLICK' }
  | { type: 'AICHAT_MIMIZE_CLICK' }
  | { type: 'AICHAT_DOCK_CLICK' }
  | { type: 'AICHAT_EXPAND_CLICK' }
  | { type: 'PANEL_CLICK_AWAY' }
  | {
      type: 'GENERATE_WITH_AI_CLICK';
      property?: BlockProperty & { inputName: `settings.input.${string}` };
    }
  | { type: 'ADD_CODE_TO_INJECT'; code: string }
  | { type: 'CLEAN_CODE_TO_INJECT' };

export type BuilderState = {
  flow: Flow;
  flowVersion: FlowVersion;

  readonly: boolean;
  loopsIndexes: Record<string, number>;
  run: FlowRun | null;
  leftSidebar: LeftSideBarType;
  rightSidebar: RightSideBarType;
  selectedStep: string | null;
  canExitRun: boolean;
  activeDraggingStep: string | null;
  saving: boolean;
  refreshBlockFormSettings: boolean;
  refreshSettings: () => void;
  exitRun: () => void;
  exitStepSettings: () => void;
  renameFlowClientSide: (newName: string) => void;
  moveToFolderClientSide: (folderId: string) => void;
  setRun: (run: FlowRun, flowVersion: FlowVersion) => void;
  setLeftSidebar: (leftSidebar: LeftSideBarType) => void;
  setRightSidebar: (rightSidebar: RightSideBarType) => void;
  applyOperation: (
    operation: FlowOperationRequest,
    onError: () => void,
  ) => void;
  removeStepSelection: () => void;
  selectStepByName: (stepName: string, openRightSideBar?: boolean) => void;
  startSaving: () => void;
  setActiveDraggingStep: (stepName: string | null) => void;
  setFlow: (flow: Flow) => void;
  exitBlockSelector: () => void;
  setVersion: (flowVersion: FlowVersion) => void;
  setVersionUpdateTimestamp: (updateTimestamp: string) => void;
  insertMention: InsertMentionHandler | null;
  setReadOnly: (readOnly: boolean) => void;
  setInsertMentionHandler: (handler: InsertMentionHandler | null) => void;
  setLoopIndex: (stepName: string, index: number) => void;
  canUndo: boolean;
  setCanUndo: (canUndo: boolean) => void;
  canRedo: boolean;
  setCanRedo: (canUndo: boolean) => void;
  dynamicPropertiesAuthReconnectCounter: number;
  refreshDynamicPropertiesForAuth: () => void;
  midpanelState: MidpanelState;
  applyMidpanelAction: (midpanelAction: MidpanelAction) => void;
};

export type BuilderInitialState = Pick<
  BuilderState,
  'flow' | 'flowVersion' | 'readonly' | 'run' | 'canExitRun'
>;
