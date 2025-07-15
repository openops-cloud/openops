import {
  FlowRun,
  FlowRunStatus,
  FlowVersion,
  TriggerType,
} from '@openops/shared';
import {
  getChildStepsInDefinitionOrder,
  getExecutedStepsInDefinitionOrder,
  getRunMessage,
  getStatusText,
} from '../run-details-helpers';

jest.mock('i18next', () => ({
  t: jest.fn((key: string) => key),
}));

describe('getRunMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('should return null', () => {
    it.each([
      ['run is null', null],
      ['run is undefined', undefined],
    ])('when %s', (_, run) => {
      // @ts-expect-error Testing null/undefined cases
      const result = getRunMessage(run, 30);
      expect(result).toBeNull();
    });

    it.each([
      ['RUNNING', FlowRunStatus.RUNNING],
      ['SCHEDULED', FlowRunStatus.SCHEDULED],
    ])('when run has %s status', (_, status) => {
      const run = { status } as FlowRun;
      const result = getRunMessage(run, 30);
      expect(result).toBeNull();
    });

    it.each([
      ['TIMEOUT', FlowRunStatus.TIMEOUT],
      ['SUCCEEDED', FlowRunStatus.SUCCEEDED],
      ['FAILED', FlowRunStatus.FAILED],
      ['STOPPED', FlowRunStatus.STOPPED],
      ['PAUSED', FlowRunStatus.PAUSED],
    ])('when run has %s status with logsFileId', (_, status) => {
      const run = { status, logsFileId: 'some-log-file-id' } as FlowRun;
      const result = getRunMessage(run, 30);
      expect(result).toBeNull();
    });
  });

  describe('should return "no logs captured" message', () => {
    it('when run has INTERNAL_ERROR status', () => {
      const run = { status: FlowRunStatus.INTERNAL_ERROR } as FlowRun;
      const result = getRunMessage(run, 30);
      expect(result).toBe('There are no logs captured for this run.');
    });
  });

  describe('should return retention message', () => {
    it.each([
      ['TIMEOUT status with null logsFileId', FlowRunStatus.TIMEOUT, null, 30],
      [
        'TIMEOUT status with undefined logsFileId',
        FlowRunStatus.TIMEOUT,
        undefined,
        30,
      ],
      [
        'SUCCEEDED status with null logsFileId',
        FlowRunStatus.SUCCEEDED,
        null,
        30,
      ],
      ['FAILED status with null logsFileId', FlowRunStatus.FAILED, null, 30],
      ['PAUSED status with null logsFileId', FlowRunStatus.PAUSED, null, 30],
      [
        'SUCCEEDED status with null retentionDays',
        FlowRunStatus.SUCCEEDED,
        null,
        null,
      ],
    ])('when run has %s', (_, status, logsFileId, retentionDays) => {
      const run = { status, logsFileId } as FlowRun;
      const result = getRunMessage(run, retentionDays);
      expect(result).toBe(
        'Logs are kept for {days} days after execution and then deleted.',
      );
    });
  });
});

describe('getExecutedStepsInDefinitionOrder', () => {
  const createMockFlowVersion = (trigger: any): FlowVersion => ({
    id: 'test-flow-version',
    created: '2024-01-01T00:00:00.000Z',
    updated: '2024-01-01T00:00:00.000Z',
    flowId: 'test-flow',
    displayName: 'Test Flow',
    trigger,
    valid: true,
    state: 'DRAFT' as any,
  });

  const createMockRun = (steps: Record<string, any> = {}): FlowRun => ({
    id: 'test-run',
    created: '2024-01-01T00:00:00.000Z',
    updated: '2024-01-01T00:00:00.000Z',
    projectId: 'test-project',
    flowId: 'test-flow',
    flowVersionId: 'test-flow-version',
    flowDisplayName: 'Test Flow',
    status: FlowRunStatus.SUCCEEDED,
    startTime: '2024-01-01T00:00:00.000Z',
    environment: 'TESTING' as any,
    steps,
  });

  describe('should return empty array', () => {
    it('when run is null', () => {
      const flowVersion = createMockFlowVersion({
        type: TriggerType.EMPTY,
        name: 'trigger',
        settings: {},
        valid: false,
        displayName: 'Select Trigger',
      });

      const result = getExecutedStepsInDefinitionOrder(null, flowVersion);
      expect(result).toEqual([]);
    });

    it('when run has no steps', () => {
      const flowVersion = createMockFlowVersion({
        type: TriggerType.EMPTY,
        name: 'trigger',
        settings: {},
        valid: false,
        displayName: 'Select Trigger',
      });

      const run = createMockRun({});

      const result = getExecutedStepsInDefinitionOrder(run, flowVersion);
      expect(result).toEqual([]);
    });

    it('when flowVersion has no trigger', () => {
      const flowVersion = createMockFlowVersion(null);
      const run = createMockRun({ step_1: {} });

      const result = getExecutedStepsInDefinitionOrder(run, flowVersion);
      expect(result).toEqual([]);
    });
  });

  describe('should return executed steps in definition order', () => {
    it('when run has executed steps that match flow definition', () => {
      const flowVersion = createMockFlowVersion({
        type: TriggerType.EMPTY,
        name: 'trigger',
        settings: {},
        valid: false,
        displayName: 'Select Trigger',
        nextAction: {
          name: 'step_1',
          type: 'ACTION' as any,
          settings: {},
          valid: true,
          displayName: 'Step 1',
          nextAction: {
            name: 'step_2',
            type: 'ACTION' as any,
            settings: {},
            valid: true,
            displayName: 'Step 2',
          },
        },
      });

      const run = createMockRun({
        trigger: {},
        step_1: {},
        step_2: {},
      });

      const result = getExecutedStepsInDefinitionOrder(run, flowVersion);
      expect(result).toEqual(['trigger', 'step_1', 'step_2']);
    });

    it('when run has executed steps but not all defined steps', () => {
      const flowVersion = createMockFlowVersion({
        type: TriggerType.EMPTY,
        name: 'trigger',
        settings: {},
        valid: false,
        displayName: 'Select Trigger',
        nextAction: {
          name: 'step_1',
          type: 'ACTION' as any,
          settings: {},
          valid: true,
          displayName: 'Step 1',
          nextAction: {
            name: 'step_2',
            type: 'ACTION' as any,
            settings: {},
            valid: true,
            displayName: 'Step 2',
          },
        },
      });

      const run = createMockRun({
        trigger: {},
        step_1: {},
        // step_2 not executed
      });

      const result = getExecutedStepsInDefinitionOrder(run, flowVersion);
      expect(result).toEqual(['trigger', 'step_1']);
    });
  });

  describe('should handle complex flow structures', () => {
    it('with branch actions', () => {
      const flowVersion = createMockFlowVersion({
        type: TriggerType.EMPTY,
        name: 'trigger',
        settings: {},
        valid: false,
        displayName: 'Select Trigger',
        nextAction: {
          name: 'branch_step',
          type: 'BRANCH' as any,
          settings: {},
          valid: true,
          displayName: 'Branch Step',
          onSuccessAction: {
            name: 'success_step',
            type: 'ACTION' as any,
            settings: {},
            valid: true,
            displayName: 'Success Step',
          },
          onFailureAction: {
            name: 'failure_step',
            type: 'ACTION' as any,
            settings: {},
            valid: true,
            displayName: 'Failure Step',
          },
        },
      });

      const run = createMockRun({
        branch_step: {},
        failure_step: {},
        success_step: {},
        trigger: {},
      });

      const result = getExecutedStepsInDefinitionOrder(run, flowVersion);
      expect(result).toEqual([
        'trigger',
        'branch_step',
        'success_step',
        'failure_step',
      ]);
    });
  });
});

describe('getChildStepsInDefinitionOrder', () => {
  const createMockFlowVersion = (trigger: any): FlowVersion => ({
    id: 'test-flow-version',
    created: '2024-01-01T00:00:00.000Z',
    updated: '2024-01-01T00:00:00.000Z',
    flowId: 'test-flow',
    displayName: 'Test Flow',
    trigger,
    valid: true,
    state: 'DRAFT' as any,
  });

  describe('should return empty array', () => {
    it('when step does not exist', () => {
      const flowVersion = createMockFlowVersion({
        type: TriggerType.EMPTY,
        name: 'trigger',
        settings: {},
        valid: false,
        displayName: 'Select Trigger',
      });

      const result = getChildStepsInDefinitionOrder(
        'non-existent-step',
        flowVersion,
      );
      expect(result).toEqual([]);
    });

    it('when step is not a loop step', () => {
      const flowVersion = createMockFlowVersion({
        type: TriggerType.EMPTY,
        name: 'trigger',
        settings: {},
        valid: false,
        displayName: 'Select Trigger',
        nextAction: {
          name: 'step_1',
          type: 'ACTION' as any,
          settings: {},
          valid: true,
          displayName: 'Step 1',
        },
      });

      const result = getChildStepsInDefinitionOrder('step_1', flowVersion);
      expect(result).toEqual([]);
    });

    it('when loop step has no firstLoopAction', () => {
      const flowVersion = createMockFlowVersion({
        type: TriggerType.EMPTY,
        name: 'trigger',
        settings: {},
        valid: false,
        displayName: 'Select Trigger',
        nextAction: {
          name: 'loop_step',
          type: 'LOOP_ON_ITEMS' as any,
          settings: {},
          valid: true,
          displayName: 'Loop Step',
          // No firstLoopAction
        },
      });

      const result = getChildStepsInDefinitionOrder('loop_step', flowVersion);
      expect(result).toEqual([]);
    });
  });

  describe('should return child steps in definition order', () => {
    it('when step is a loop step with child actions', () => {
      const flowVersion = createMockFlowVersion({
        type: TriggerType.EMPTY,
        name: 'trigger',
        settings: {},
        valid: false,
        displayName: 'Select Trigger',
        nextAction: {
          name: 'loop_step',
          type: 'LOOP_ON_ITEMS' as any,
          settings: {},
          valid: true,
          displayName: 'Loop Step',
          firstLoopAction: {
            name: 'child_step_1',
            type: 'ACTION' as any,
            settings: {},
            valid: true,
            displayName: 'Child Step 1',
            nextAction: {
              name: 'child_step_2',
              type: 'ACTION' as any,
              settings: {},
              valid: true,
              displayName: 'Child Step 2',
            },
          },
        },
      });

      const result = getChildStepsInDefinitionOrder('loop_step', flowVersion);
      expect(result).toEqual(['child_step_1', 'child_step_2']);
    });

    it('when loop step has nested branch actions', () => {
      const flowVersion = createMockFlowVersion({
        type: TriggerType.EMPTY,
        name: 'trigger',
        settings: {},
        valid: false,
        displayName: 'Select Trigger',
        nextAction: {
          name: 'loop_step',
          type: 'LOOP_ON_ITEMS' as any,
          settings: {},
          valid: true,
          displayName: 'Loop Step',
          firstLoopAction: {
            name: 'branch_step',
            type: 'BRANCH' as any,
            settings: {},
            valid: true,
            displayName: 'Branch Step',
            onSuccessAction: {
              name: 'success_step',
              type: 'ACTION' as any,
              settings: {},
              valid: true,
              displayName: 'Success Step',
            },
            onFailureAction: {
              name: 'failure_step',
              type: 'ACTION' as any,
              settings: {},
              valid: true,
              displayName: 'Failure Step',
            },
          },
        },
      });

      const result = getChildStepsInDefinitionOrder('loop_step', flowVersion);
      expect(result).toEqual(['branch_step', 'success_step', 'failure_step']);
    });
  });

  describe('should handle branch actions', () => {
    it('when branch step has success and failure actions', () => {
      const flowVersion = createMockFlowVersion({
        type: TriggerType.EMPTY,
        name: 'trigger',
        settings: {},
        valid: false,
        displayName: 'Select Trigger',
        nextAction: {
          name: 'branch_step',
          type: 'BRANCH' as any,
          settings: {},
          valid: true,
          displayName: 'Branch Step',
          onSuccessAction: {
            name: 'success_step',
            type: 'ACTION' as any,
            settings: {},
            valid: true,
            displayName: 'Success Step',
          },
          onFailureAction: {
            name: 'failure_step',
            type: 'ACTION' as any,
            settings: {},
            valid: true,
            displayName: 'Failure Step',
          },
        },
      });

      const result = getChildStepsInDefinitionOrder('branch_step', flowVersion);
      expect(result).toEqual(['success_step', 'failure_step']);
    });

    it('when branch step has only success action', () => {
      const flowVersion = createMockFlowVersion({
        type: TriggerType.EMPTY,
        name: 'trigger',
        settings: {},
        valid: false,
        displayName: 'Select Trigger',
        nextAction: {
          name: 'branch_step',
          type: 'BRANCH' as any,
          settings: {},
          valid: true,
          displayName: 'Branch Step',
          onSuccessAction: {
            name: 'success_step',
            type: 'ACTION' as any,
            settings: {},
            valid: true,
            displayName: 'Success Step',
          },
        },
      });

      const result = getChildStepsInDefinitionOrder('branch_step', flowVersion);
      expect(result).toEqual(['success_step']);
    });
  });

  describe('should handle split actions', () => {
    it('when split step has multiple branches', () => {
      const flowVersion = createMockFlowVersion({
        type: TriggerType.EMPTY,
        name: 'trigger',
        settings: {},
        valid: false,
        displayName: 'Select Trigger',
        nextAction: {
          name: 'split_step',
          type: 'SPLIT' as any,
          settings: {
            defaultBranch: 'branch1',
            options: [
              { id: 'branch1', name: 'Branch 1' },
              { id: 'branch2', name: 'Branch 2' },
            ],
          },
          valid: true,
          displayName: 'Split Step',
          branches: [
            {
              optionId: 'branch1',
              nextAction: {
                name: 'branch1_step',
                type: 'ACTION' as any,
                settings: {},
                valid: true,
                displayName: 'Branch 1 Step',
              },
            },
            {
              optionId: 'branch2',
              nextAction: {
                name: 'branch2_step',
                type: 'ACTION' as any,
                settings: {},
                valid: true,
                displayName: 'Branch 2 Step',
              },
            },
          ],
        },
      });

      const result = getChildStepsInDefinitionOrder('split_step', flowVersion);
      expect(result).toEqual(['branch1_step', 'branch2_step']);
    });
  });
});

describe('getStatusText', () => {
  describe('should return success messages', () => {
    it.each([
      ['STOPPED', FlowRunStatus.STOPPED],
      ['SUCCEEDED', FlowRunStatus.SUCCEEDED],
    ])('when status is %s', (_, status) => {
      const result = getStatusText(status, 60);
      expect(result).toBe('Run Succeeded');
    });
  });

  describe('should return specific status messages', () => {
    it.each([
      ['FAILED', FlowRunStatus.FAILED, 'Run Failed'],
      ['PAUSED', FlowRunStatus.PAUSED, 'Workflow Run is paused'],
      ['RUNNING', FlowRunStatus.RUNNING, 'Running'],
      [
        'INTERNAL_ERROR',
        FlowRunStatus.INTERNAL_ERROR,
        'Run failed for an unknown reason, contact support.',
      ],
    ])('when status is %s', (_, status, expectedMessage) => {
      const result = getStatusText(status, 60);
      expect(result).toBe(expectedMessage);
    });
  });

  describe('should return timeout message', () => {
    it.each([
      [30, 'Run exceeded {timeout} seconds, try to optimize your steps.'],
      [60, 'Run exceeded {timeout} seconds, try to optimize your steps.'],
      [120, 'Run exceeded {timeout} seconds, try to optimize your steps.'],
      [-1, 'Run exceeded {timeout} seconds, try to optimize your steps.'],
    ])('when timeout is %s seconds', (timeout, expectedMessage) => {
      const result = getStatusText(FlowRunStatus.TIMEOUT, timeout);
      expect(result).toBe(expectedMessage);
    });
  });

  describe('should handle unknown status', () => {
    it('when status is not recognized', () => {
      // @ts-expect-error Testing unknown status
      const result = getStatusText('UNKNOWN_STATUS', 60);
      expect(result).toBe('Unknown status');
    });
  });
});
