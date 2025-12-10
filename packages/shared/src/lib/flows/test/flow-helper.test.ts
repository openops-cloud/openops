import { Action, ActionType } from '../actions/action';
import { flowHelper } from '../flow-helper';
import { FlowVersion, FlowVersionState } from '../flow-version';
import { Trigger, TriggerType } from '../triggers/trigger';

describe('flowHelper', () => {
  describe('indexToAlphabetical', () => {
    it.each<[number, string]>([
      [0, 'a'],
      [25, 'z'],
      [26, 'aa'],
      [27, 'ab'],
      [51, 'az'],
      [52, 'ba'],
      [701, 'zz'],
      [702, 'aaa'],
    ])('converts %d to %s', (input, expected) => {
      expect(flowHelper.indexToAlphabetical(input)).toBe(expected);
    });
  });

  describe('findUnusedName', () => {
    it('should return the first alphabetical suffix when none exist', () => {
      const names: string[] = [];
      expect(flowHelper.findUnusedName(names, 'step')).toBe('step_a');
    });

    it('should fill the first gap in the existing names', () => {
      const names = ['step_a', 'step_b', 'step_d'];
      expect(flowHelper.findUnusedName(names, 'step')).toBe('step_c');
    });

    it('should skip unrelated names and prefixes', () => {
      const names = ['step_a', 'other_a', 'step_b'];
      expect(flowHelper.findUnusedName(names, 'step')).toBe('step_c');
    });

    it('should roll over to double letters after z', () => {
      const names = Array.from(
        { length: 26 },
        (_, i) => `step_${flowHelper.indexToAlphabetical(i)}`,
      );
      expect(flowHelper.findUnusedName(names, 'step')).toBe('step_aa');
    });

    it('should work with larger gaps and mixed ordering', () => {
      const names = ['step_aa', 'step_c', 'step_a', 'step_ab'];
      expect(flowHelper.findUnusedName(names, 'step')).toBe('step_b');
    });
  });

  describe('truncateFlow', () => {
    it("should return the same step if it's already the last step", () => {
      const step = { name: 'A', nextAction: undefined } as Action;
      expect(flowHelper.truncateFlow(step, 'A')).toEqual({
        name: 'A',
        nextAction: undefined,
      });
    });

    it('should remove nextAction if lastStepName is found in the chain', () => {
      const step = {
        name: 'A',
        nextAction: {
          name: 'B',
          nextAction: { name: 'C', nextAction: undefined },
        },
      } as Action;

      expect(flowHelper.truncateFlow(step, 'B')).toEqual({
        name: 'A',
        nextAction: { name: 'B', nextAction: undefined },
      });
    });

    it('should not modify the chain if lastStepName does not exist', () => {
      const step = {
        name: 'A',
        nextAction: {
          name: 'B',
          nextAction: { name: 'C', nextAction: undefined },
        },
      } as Action;

      expect(flowHelper.truncateFlow(step, 'D')).toEqual({
        name: 'A',
        nextAction: {
          name: 'B',
          nextAction: { name: 'C', nextAction: undefined },
        },
      });
    });

    it('should work with a longer chain', () => {
      const step = {
        name: 'A',
        nextAction: {
          name: 'B',
          nextAction: {
            name: 'C',
            nextAction: {
              name: 'D',
              nextAction: { name: 'E', nextAction: undefined },
            },
          },
        },
      } as Action;

      expect(flowHelper.truncateFlow(step, 'C')).toEqual({
        name: 'A',
        nextAction: {
          name: 'B',
          nextAction: {
            name: 'C',
            nextAction: undefined,
          },
        },
      });
    });
  });

  describe('getStepWithIndex', () => {
    const createSimpleFlowVersion = (): FlowVersion => {
      const trigger: Trigger = {
        id: 'trigger_id',
        name: 'trigger',
        type: TriggerType.EMPTY,
        valid: true,
        settings: {},
        displayName: 'Trigger',
        nextAction: {
          id: 'action_1',
          name: 'action_1',
          type: ActionType.CODE,
          valid: true,
          settings: {
            sourceCode: {
              code: 'test',
              packageJson: '{}',
            },
            input: {},
          },
          displayName: 'Action 1',
          nextAction: {
            id: 'action_2',
            name: 'action_2',
            type: ActionType.CODE,
            valid: true,
            settings: {
              sourceCode: {
                code: 'test',
                packageJson: '{}',
              },
              input: {},
            },
            displayName: 'Action 2',
            nextAction: undefined,
          },
        },
      };

      return {
        id: 'flow_version_id',
        flowId: 'flow_id',
        displayName: 'Test Flow',
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        updatedBy: 'user_id',
        trigger,
        valid: true,
        state: FlowVersionState.DRAFT,
        testRunActionLimits: {
          isEnabled: false,
          limits: [],
        },
      };
    };

    it('should return step and correct index for trigger', () => {
      const flowVersion = createSimpleFlowVersion();
      const result = flowHelper.getStepWithIndex(flowVersion, 'trigger');

      expect(result.step).toBeDefined();
      expect(result.step?.name).toBe('trigger');
      expect(result.stepIndex).toBe(1);
    });

    it('should return step and correct index for first action', () => {
      const flowVersion = createSimpleFlowVersion();
      const result = flowHelper.getStepWithIndex(flowVersion, 'action_1');

      expect(result.step).toBeDefined();
      expect(result.step?.name).toBe('action_1');
      expect(result.stepIndex).toBe(2);
    });

    it('should return step and correct index for second action', () => {
      const flowVersion = createSimpleFlowVersion();
      const result = flowHelper.getStepWithIndex(flowVersion, 'action_2');

      expect(result.step).toBeDefined();
      expect(result.step?.name).toBe('action_2');
      expect(result.stepIndex).toBe(3);
    });

    it('should return undefined for both step and stepIndex when step does not exist', () => {
      const flowVersion = createSimpleFlowVersion();
      const result = flowHelper.getStepWithIndex(
        flowVersion,
        'non_existent_step',
      );

      expect(result.step).toBeUndefined();
      expect(result.stepIndex).toBeUndefined();
    });

    it('should return correct index for step in a branch action', () => {
      const flowVersion: FlowVersion = {
        id: 'flow_version_id',
        flowId: 'flow_id',
        displayName: 'Test Flow',
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        updatedBy: 'user_id',
        trigger: {
          id: 'trigger_id',
          name: 'trigger',
          type: TriggerType.EMPTY,
          valid: true,
          settings: {},
          displayName: 'Trigger',
          nextAction: {
            id: 'branch_action',
            name: 'branch_action',
            type: ActionType.BRANCH,
            valid: true,
            settings: {
              conditions: [[]],
            },
            displayName: 'Branch',
            onSuccessAction: {
              id: 'success_action',
              name: 'success_action',
              type: ActionType.CODE,
              valid: true,
              settings: {
                sourceCode: {
                  code: 'test',
                  packageJson: '{}',
                },
                input: {},
              },
              displayName: 'Success Action',
              nextAction: undefined,
            },
            onFailureAction: {
              id: 'failure_action',
              name: 'failure_action',
              type: ActionType.CODE,
              valid: true,
              settings: {
                sourceCode: {
                  code: 'test',
                  packageJson: '{}',
                },
                input: {},
              },
              displayName: 'Failure Action',
              nextAction: undefined,
            },
            nextAction: undefined,
          },
        },
        valid: true,
        state: FlowVersionState.DRAFT,
        testRunActionLimits: {
          isEnabled: false,
          limits: [],
        },
      };

      const branchResult = flowHelper.getStepWithIndex(
        flowVersion,
        'branch_action',
      );
      expect(branchResult.step?.name).toBe('branch_action');
      expect(branchResult.stepIndex).toBe(2);

      const successResult = flowHelper.getStepWithIndex(
        flowVersion,
        'success_action',
      );
      expect(successResult.step?.name).toBe('success_action');
      expect(successResult.stepIndex).toBeGreaterThan(2);

      const failureResult = flowHelper.getStepWithIndex(
        flowVersion,
        'failure_action',
      );
      expect(failureResult.step?.name).toBe('failure_action');
      expect(failureResult.stepIndex).toBeGreaterThan(2);
    });

    it('should return correct index for step in a loop action', () => {
      const flowVersion: FlowVersion = {
        id: 'flow_version_id',
        flowId: 'flow_id',
        displayName: 'Test Flow',
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        updatedBy: 'user_id',
        trigger: {
          id: 'trigger_id',
          name: 'trigger',
          type: TriggerType.EMPTY,
          valid: true,
          settings: {},
          displayName: 'Trigger',
          nextAction: {
            id: 'loop_action',
            name: 'loop_action',
            type: ActionType.LOOP_ON_ITEMS,
            valid: true,
            settings: {
              items: '',
            },
            displayName: 'Loop',
            firstLoopAction: {
              id: 'loop_child',
              name: 'loop_child',
              type: ActionType.CODE,
              valid: true,
              settings: {
                sourceCode: {
                  code: 'test',
                  packageJson: '{}',
                },
                input: {},
              },
              displayName: 'Loop Child',
              nextAction: undefined,
            },
            nextAction: undefined,
          },
        },
        valid: true,
        state: FlowVersionState.DRAFT,
        testRunActionLimits: {
          isEnabled: false,
          limits: [],
        },
      };

      const loopResult = flowHelper.getStepWithIndex(
        flowVersion,
        'loop_action',
      );
      expect(loopResult.step?.name).toBe('loop_action');
      expect(loopResult.stepIndex).toBe(2);

      const childResult = flowHelper.getStepWithIndex(
        flowVersion,
        'loop_child',
      );
      expect(childResult.step?.name).toBe('loop_child');
      expect(childResult.stepIndex).toBeGreaterThan(2);
    });
  });
});
