import { ActionType, StepWithIndex, TriggerType } from '@openops/shared';
import { dataSelectorUtils } from '../data-selector-utils';

jest.mock('@/app/lib/utils', () => ({
  formatUtils: {
    formatStepInputOrOutput: (v: unknown) => v,
  },
}));

describe('dataSelectorUtils', () => {
  describe('getAllStepsMentions', () => {
    const baseStep = {
      id: 'step1',
      name: 'step1',
      displayName: 'Step 1',
      type: TriggerType.BLOCK,
      settings: {},
      valid: true,
      dfsIndex: 0,
    } as StepWithIndex;
    const baseStep2 = {
      id: 'step2',
      name: 'step2',
      displayName: 'Step 2',
      type: ActionType.BLOCK,
      settings: {},
      valid: true,
      dfsIndex: 1,
    } as StepWithIndex;
    const mockStep = (overrides = {}): StepWithIndex => ({
      ...baseStep,
      ...overrides,
    });
    const mockStep2 = (overrides = {}): StepWithIndex => ({
      ...baseStep2,
      ...overrides,
    });

    it.each([
      ['undefined', undefined],
      ['empty object', {}],
    ])(
      'returns empty array if stepsTestOutput is %s',
      (_desc, stepsTestOutput) => {
        const result = dataSelectorUtils.getAllStepsMentions(
          [mockStep()],
          stepsTestOutput,
        );
        expect(result).toEqual([]);
      },
    );

    it('returns test node if stepsTestOutput for step.id is missing', () => {
      const step = mockStep();
      const result = dataSelectorUtils.getAllStepsMentions([step], {
        otherStep: { output: {}, lastTestDate: '2024-01-01' },
      });
      expect(result[0].children?.[0].data.isTestStepNode).toBe(true);
    });

    it.each([
      ['undefined', undefined],
      ['null', null],
    ])(
      'returns test node if stepNeedsTesting (lastTestDate is %s)',
      (_desc, lastTestDate) => {
        const step = mockStep();
        const result = dataSelectorUtils.getAllStepsMentions([step], {
          step1: { output: {}, lastTestDate: lastTestDate as any },
        });
        expect(result[0].children?.[0].data.isTestStepNode).toBe(true);
      },
    );

    it('returns mention tree node if step has valid output', () => {
      const step = mockStep();
      const output = { foo: 'bar' };
      const result = dataSelectorUtils.getAllStepsMentions([step], {
        step1: { output, lastTestDate: '2024-01-01' },
      });
      expect(result[0].data.displayName).toBe('1. Step 1');
      expect(result[0].children?.[0].data.displayName).toBe('foo');
      expect(result[0].children?.[0].data.value).toBe('bar');
    });

    it('handles multiple steps', () => {
      const steps = [mockStep(), mockStep2()];
      const output1 = { foo: 'bar' };
      const output2 = { baz: 'qux' };
      const stepsTestOutput = {
        step1: { output: output1, lastTestDate: '2024-01-01' },
        step2: { output: output2, lastTestDate: '2024-01-01' },
      };
      const result = dataSelectorUtils.getAllStepsMentions(
        steps,
        stepsTestOutput,
      );
      expect(result.length).toBe(2);
      expect(result[0].children?.[0].data.value).toBe('bar');
      expect(result[1].children?.[0].data.value).toBe('qux');
    });

    it('handles a mix of steps needing testing and steps with valid output', () => {
      const stepNeedingTest = mockStep({
        id: 'step1',
        name: 'step1',
        dfsIndex: 0,
      });
      const stepWithOutput = mockStep2({
        id: 'step2',
        name: 'step2',
        dfsIndex: 1,
      });
      const steps = [stepNeedingTest, stepWithOutput];
      const stepsTestOutput = {
        step1: { output: undefined, lastTestDate: undefined as any },
        step2: { output: { foo: 'bar' }, lastTestDate: '2024-01-01' },
      };
      const result = dataSelectorUtils.getAllStepsMentions(
        steps,
        stepsTestOutput,
      );
      expect(result[0].children?.[0].data.isTestStepNode).toBe(true);
      expect(result[1].data.displayName).toBe('2. Step 2');
      expect(result[1].children?.[0].data.displayName).toBe('foo');
      expect(result[1].children?.[0].data.value).toBe('bar');
    });
  });

  describe('createTestNode', () => {
    it('creates a test node with correct structure for an Action-like step', () => {
      const step = {
        name: 'actionStep',
        displayName: 'Action Step',
      };
      const displayName = '1. Action Step';
      const node = dataSelectorUtils.createTestNode(step as any, displayName);
      expect(node.key).toBe('actionStep');
      expect(node.data.displayName).toBe(displayName);
      expect(node.data.propertyPath).toBe('actionStep');
      expect(node.children).toHaveLength(1);
      expect(node.children?.[0].data.isTestStepNode).toBe(true);
      expect(node.children?.[0].data.displayName).toBe(displayName);
      expect(node.children?.[0].data.propertyPath).toBe('actionStep');
      expect(node.children?.[0].key).toBe('test_actionStep');
    });

    it('creates a test node with correct structure for a Trigger-like step', () => {
      const step = {
        name: 'triggerStep',
        displayName: 'Trigger Step',
      };
      const displayName = '1. Trigger Step';
      const node = dataSelectorUtils.createTestNode(step as any, displayName);
      expect(node.key).toBe('triggerStep');
      expect(node.data.displayName).toBe(displayName);
      expect(node.data.propertyPath).toBe('triggerStep');
      expect(node.children).toHaveLength(1);
      expect(node.children?.[0].data.isTestStepNode).toBe(true);
      expect(node.children?.[0].data.displayName).toBe(displayName);
      expect(node.children?.[0].data.propertyPath).toBe('triggerStep');
      expect(node.children?.[0].key).toBe('test_triggerStep');
    });
  });
});
