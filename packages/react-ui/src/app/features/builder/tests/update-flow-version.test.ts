import { AI_CHAT_CONTAINER_SIZES } from '@openops/components/ui';
import {
  ActionType,
  FlowOperationRequest,
  FlowOperationType,
  FlowStatus,
  FlowVersionState,
  TriggerType,
} from '@openops/shared';
import { waitFor } from '@testing-library/react';
import {
  BuilderState,
  LeftSideBarType,
  RightSideBarType,
} from '../builder-types';
import { stepTestOutputCache } from '../data-selector/data-selector-cache';
import { DataSelectorSizeState } from '../data-selector/data-selector-size-togglers';
import { updateFlowVersion } from '../update-flow-version';

jest.mock('@/app/features/flows/lib/flows-api');
jest.mock('../ai-chat/lib/chat-api');

describe('updateFlowVersion', () => {
  let mockState: BuilderState;
  let mockSet: () => void;
  let mockOnError: () => void;

  beforeEach(() => {
    mockState = {
      flow: {
        id: 'flow1',
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        projectId: 'project1',
        folderId: null,
        status: FlowStatus.ENABLED,
        schedule: null,
        publishedVersionId: null,
      },
      flowVersion: {
        id: 'version1',
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        flowId: 'flow1',
        displayName: 'Test Flow Version',
        description: '',
        trigger: {
          id: 'trigger1',
          name: 'trigger1',
          type: TriggerType.EMPTY,
          settings: {},
          valid: false,
          displayName: 'Select Trigger',
          nextAction: {
            id: 'step_1',
            name: 'step_1',
            type: ActionType.BLOCK,
            valid: false,
            displayName: 'step1',
            settings: {
              blockVersion: '1.0.0',
              blockName: 'test-block',
              actionName: 'test-action',
            },
          },
        },
        updatedBy: null,
        valid: false,
        state: FlowVersionState.DRAFT,
      },
      selectedStep: 'step_1',
      rightSidebar: RightSideBarType.BLOCK_SETTINGS,
      readonly: false,
      loopsIndexes: {},
      run: null,
      leftSidebar: LeftSideBarType.NONE,
      canExitRun: false,
      activeDraggingStep: null,
      saving: false,
      refreshBlockFormSettings: false,
      refreshSettings: jest.fn(),
      exitRun: jest.fn(),
      exitStepSettings: jest.fn(),
      renameFlowClientSide: jest.fn(),
      moveToFolderClientSide: jest.fn(),
      setRun: jest.fn(),
      setLeftSidebar: jest.fn(),
      setRightSidebar: jest.fn(),
      applyOperation: jest.fn(),
      removeStepSelection: jest.fn(),
      selectStepByName: jest.fn(),
      startSaving: jest.fn(),
      setActiveDraggingStep: jest.fn(),
      setFlow: jest.fn(),
      exitBlockSelector: jest.fn(),
      setVersion: jest.fn(),
      setVersionUpdateTimestamp: jest.fn(),
      insertMention: null,
      setReadOnly: jest.fn(),
      setInsertMentionHandler: jest.fn(),
      setLoopIndex: jest.fn(),
      canUndo: false,
      setCanUndo: jest.fn(),
      canRedo: false,
      setCanRedo: jest.fn(),
      dynamicPropertiesAuthReconnectCounter: 0,
      refreshDynamicPropertiesForAuth: jest.fn(),
      midpanelState: {
        showDataSelector: false,
        dataSelectorSize: DataSelectorSizeState.DOCKED,
        showAiChat: false,
        aiContainerSize: AI_CHAT_CONTAINER_SIZES.COLLAPSED,
        aiChatProperty: undefined,
        codeToInject: undefined,
      },
      applyMidpanelAction: jest.fn(),
    };

    mockSet = jest.fn();
    mockOnError = jest.fn();
  });

  it('should update flow version when operation is applied', async () => {
    const operation = {
      type: FlowOperationType.UPDATE_ACTION,
      request: {
        name: 'step_1',
        type: 'BLOCK',
        valid: false,
        settings: { blockVersion: '1.0.0' },
        displayName: 'Google Cloud CLI',
      },
    } as FlowOperationRequest;

    const result = updateFlowVersion(
      mockState,
      operation,
      mockOnError,
      mockSet,
    );

    await waitFor(() => expect(mockSet).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockSet).toHaveBeenCalledWith({ saving: true }));

    expect(result).toEqual({
      flowVersion: {
        id: 'version1',
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        flowId: 'flow1',
        displayName: 'Test Flow Version',
        description: '',
        state: FlowVersionState.DRAFT,
        updatedBy: null,
        trigger: {
          id: 'trigger1',
          name: 'trigger1',
          type: 'EMPTY',
          settings: {},
          valid: false,
          displayName: 'Select Trigger',
          nextAction: {
            id: 'step_1',
            name: 'step_1',
            valid: false,
            type: 'BLOCK',
            displayName: 'Google Cloud CLI',
            settings: { blockVersion: '^1.0.0' },
          },
        },
        valid: false,
      },
    });
  });

  it('should handle delete action and clear selection when deleting selected step', async () => {
    const operation = {
      type: FlowOperationType.DELETE_ACTION,
      request: { name: 'step_1' },
    } as FlowOperationRequest;

    updateFlowVersion(mockState, operation, mockOnError, mockSet);

    expect(mockSet).toHaveBeenCalledWith({ selectedStep: undefined });
    expect(mockSet).toHaveBeenCalledWith({
      rightSidebar: RightSideBarType.NONE,
    });
  });

  it('should handle duplicate action selecting new step', async () => {
    const operation = {
      type: FlowOperationType.DUPLICATE_ACTION,
      request: { stepName: 'step_1' },
    } as FlowOperationRequest;

    updateFlowVersion(mockState, operation, mockOnError, mockSet);

    await waitFor(() => expect(mockSet).toHaveBeenCalledWith({ saving: true }));
    await waitFor(() =>
      expect(mockSet).toHaveBeenCalledWith({ selectedStep: 'step_2' }),
    );
  });

  it('should call stepTestOutputCache.clearStep when deleting a step', async () => {
    const operation = {
      type: FlowOperationType.DELETE_ACTION,
      request: { name: 'step_1' },
    } as FlowOperationRequest;
    const clearStepSpy = jest.spyOn(stepTestOutputCache, 'clearStep');
    updateFlowVersion(mockState, operation, mockOnError, mockSet);

    expect(clearStepSpy).toHaveBeenCalledWith('step_1');
    clearStepSpy.mockRestore();
  });
});
