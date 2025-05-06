import { ActionType, FlowOperationType, TriggerType } from '@openops/shared';
import { waitFor } from '@testing-library/react';
import { aiChatApi } from '../ai-chat/lib/chat-api';
import { BuilderState, RightSideBarType } from '../builder-types';
import { updateFlowVersion } from '../update-flow-version';

jest.mock('@/app/features/flows/lib/flows-api');
jest.mock('../ai-chat/lib/chat-api');

describe('updateFlowVersion', () => {
  let mockState: BuilderState;
  let mockSet: () => void;
  let mockOnError: () => void;

  beforeEach(() => {
    mockState = {
      flow: { id: 'flow1' },
      flowVersion: {
        id: 'version1',
        trigger: {
          name: 'trigger1',
          type: TriggerType.EMPTY,
          settings: {},
          valid: false,
          displayName: 'Select Trigger',
          nextAction: {
            name: 'step_1',
            type: ActionType.BLOCK,
            valid: false,
            displayName: 'step1',
            settings: {
              blockVersion: '1.0.0',
            },
          },
        },
      },
      selectedStep: 'step_1',
      rightSidebar: RightSideBarType.BLOCK_SETTINGS,
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
    };

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
        trigger: {
          name: 'trigger1',
          type: 'EMPTY',
          settings: {},
          valid: false,
          displayName: 'Select Trigger',
          nextAction: {
            displayName: 'Google Cloud CLI',
            name: 'step_1',
            valid: false,
            type: 'BLOCK',
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
    };

    (aiChatApi.open as jest.Mock).mockResolvedValue({ chatId: 'chat1' });
    (aiChatApi.delete as jest.Mock).mockResolvedValue({});

    updateFlowVersion(mockState, operation, mockOnError, mockSet);

    expect(mockSet).toHaveBeenCalledWith({ selectedStep: undefined });
    expect(mockSet).toHaveBeenCalledWith({
      rightSidebar: RightSideBarType.NONE,
    });

    await waitFor(() => {
      expect(aiChatApi.open).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(aiChatApi.delete).toHaveBeenCalled();
    });
  });

  it('should handle duplicate action selecting new step', async () => {
    const operation = {
      type: FlowOperationType.DUPLICATE_ACTION,
      request: { stepName: 'step_1' },
    };

    updateFlowVersion(mockState, operation, mockOnError, mockSet);

    await waitFor(() => expect(mockSet).toHaveBeenCalledWith({ saving: true }));
    await waitFor(() =>
      expect(mockSet).toHaveBeenCalledWith({ selectedStep: 'step_2' }),
    );
  });
});
