import { ActionType, StepWithIndex, TriggerType } from '@openops/shared';
import { BuilderState } from '../../builder-types';
import { dataSelectorUtils, MentionTreeNode } from '../data-selector-utils';

jest.mock('@/app/lib/utils', () => ({
  formatUtils: {
    formatStepInputOrOutput: (v: unknown) => v,
  },
}));

const createTestTrigger = (name = 'trigger'): any => ({
  name,
  displayName: 'Test Trigger',
  type: TriggerType.BLOCK,
  settings: {},
  valid: true,
  nextAction: null,
});

const createTestAction = (
  name: string,
  displayName: string,
  nextAction = null,
): any => ({
  id: name,
  name,
  displayName,
  type: ActionType.BLOCK,
  settings: {},
  valid: true,
  nextAction,
});

const createTestFlow = () => {
  const step3 = createTestAction('step3', 'Step 3');
  const step2 = createTestAction('step2', 'Step 2', step3);
  const step1 = createTestAction('step1', 'Step 1', step2);
  const trigger = createTestTrigger();
  trigger.nextAction = step1;
  return trigger;
};

const createBuilderState = (overrides = {}): BuilderState => {
  const defaultState: any = {
    flow: { id: 'flow1', name: 'Test Flow' },
    flowVersion: { id: 'version1' },
  };

  return { ...defaultState, ...overrides };
};

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
        otherStep: {
          input: {},
          output: {},
          lastTestDate: '2024-01-01',
          success: null,
        },
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
          step1: {
            input: {},
            output: {},
            lastTestDate: lastTestDate as any,
            success: null,
          },
        });
        expect(result[0].children?.[0].data.isTestStepNode).toBe(true);
      },
    );

    it('returns mention tree node if step has valid output', () => {
      const step = mockStep();
      const output = { foo: 'bar' };
      const result = dataSelectorUtils.getAllStepsMentions([step], {
        step1: { input: {}, output, lastTestDate: '2024-01-01', success: true },
      });
      expect(result[0].data.displayName).toBe('1. Step 1');
      expect(result[0].data.success).toBe(true);
      expect(result[0].children?.[0].data.displayName).toBe('foo');
      expect(result[0].children?.[0].data.value).toBe('bar');
    });

    it('handles multiple steps', () => {
      const steps = [mockStep(), mockStep2()];
      const output1 = { foo: 'bar' };
      const output2 = { baz: 'qux' };
      const stepsTestOutput = {
        step1: {
          input: {},
          output: output1,
          lastTestDate: '2024-01-01',
          success: true,
        },
        step2: {
          input: {},
          output: output2,
          lastTestDate: '2024-01-01',
          success: false,
        },
      };
      const result = dataSelectorUtils.getAllStepsMentions(
        steps,
        stepsTestOutput,
      );
      expect(result.length).toBe(2);
      expect(result[0].data.success).toBe(true);
      expect(result[1].data.success).toBe(false);
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
        step1: {
          input: {},
          output: undefined,
          lastTestDate: undefined as any,
          success: null,
        },
        step2: {
          input: {},
          output: { foo: 'bar' },
          lastTestDate: '2024-01-01',
          success: true,
        },
      };
      const result = dataSelectorUtils.getAllStepsMentions(
        steps,
        stepsTestOutput,
      );
      expect(result[0].children?.[0].data.isTestStepNode).toBe(true);
      expect(result[1].data.displayName).toBe('2. Step 2');
      expect(result[1].data.success).toBe(true);
      expect(result[1].children?.[0].data.displayName).toBe('foo');
      expect(result[1].children?.[0].data.value).toBe('bar');
      expect(result[1].children?.[0].data.success).toBe(null);
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

    it('uses traverseStepOutputAndReturnMentionTree when step has sample data', () => {
      const step = {
        name: 'actionStep',
        displayName: 'Action Step',
        settings: {
          inputUiInfo: {
            sampleData: { foo: 'bar' },
          },
        },
      };
      const displayName = '1. Action Step';
      const node = dataSelectorUtils.createTestNode(step as any, displayName);

      expect(node.children?.[0]?.data.isTestStepNode).toBeUndefined();

      expect(node.key).toBe('actionStep');
      expect(node.data.displayName).toBe(displayName);
      expect(node.data.propertyPath).toBe('actionStep');
      expect(node.data.success).toBe(true);
      expect(node.children).toHaveLength(1);
      expect(node.children?.[0].key).toBe("actionStep['foo']");
      expect(node.children?.[0].data.propertyPath).toBe("actionStep['foo']");
      expect(node.children?.[0].data.value).toBe('bar');
    });

    it('creates test node when step has empty sample data object', () => {
      const step = {
        name: 'actionStep',
        displayName: 'Action Step',
        settings: {
          inputUiInfo: {
            sampleData: {},
          },
        },
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

    it('creates test node when step has null sample data', () => {
      const step = {
        name: 'actionStep',
        displayName: 'Action Step',
        settings: {
          inputUiInfo: {
            sampleData: null,
          },
        },
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

    it('creates test node when step has undefined sample data', () => {
      const step = {
        name: 'actionStep',
        displayName: 'Action Step',
        settings: {
          inputUiInfo: {
            sampleData: undefined,
          },
        },
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

    it('creates test node when step has no inputUiInfo', () => {
      const step = {
        name: 'actionStep',
        displayName: 'Action Step',
        settings: {},
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
  });

  describe('filterBy', () => {
    it('returns the original array when query is empty', () => {
      const nodes: MentionTreeNode[] = [
        {
          key: 'node1',
          data: {
            propertyPath: 'path1',
            displayName: 'Node 1',
            value: 'value1',
            success: true,
          },
        },
        {
          key: 'node2',
          data: {
            propertyPath: 'path2',
            displayName: 'Node 2',
            value: 'value2',
            success: false,
          },
        },
      ];

      const result = dataSelectorUtils.filterBy(nodes, '');
      expect(result).toEqual(nodes);
    });

    it.each([
      {
        desc: 'filters nodes by displayName',
        nodes: [
          {
            key: 'node1',
            data: {
              propertyPath: 'path1',
              displayName: 'Node 1',
              value: 'value1',
              success: true,
            },
          },
          {
            key: 'node2',
            data: {
              propertyPath: 'path2',
              displayName: 'Different Name',
              value: 'value2',
              success: false,
            },
          },
        ],
        query: 'node',
        expectedKeys: ['node1'],
      },
      {
        desc: 'filters nodes by value',
        nodes: [
          {
            key: 'node1',
            data: {
              propertyPath: 'path1',
              displayName: 'Node 1',
              value: 'some value',
              success: true,
            },
          },
          {
            key: 'node2',
            data: {
              propertyPath: 'path2',
              displayName: 'Node 2',
              value: 'other content',
              success: false,
            },
          },
        ],
        query: 'other',
        expectedKeys: ['node2'],
      },
    ])('$desc', ({ nodes, query, expectedKeys }) => {
      const result = dataSelectorUtils.filterBy(nodes, query);
      expect(result.map((n: MentionTreeNode) => n.key)).toEqual(expectedKeys);
    });

    it('recursively filters children', () => {
      const nodes: MentionTreeNode[] = [
        {
          key: 'parent1',
          data: {
            propertyPath: 'parent',
            displayName: 'Parent',
            value: 'parent value',
            success: true,
          },
          children: [
            {
              key: 'child1',
              data: {
                propertyPath: 'child',
                displayName: 'Child',
                value: 'match this',
                success: null,
              },
            },
          ],
        },
        {
          key: 'parent2',
          data: {
            propertyPath: 'parent2',
            displayName: 'Parent 2',
            value: 'parent value 2',
            success: false,
          },
          children: [
            {
              key: 'child2',
              data: {
                propertyPath: 'child2',
                displayName: 'Child 2',
                value: 'different value',
                success: null,
              },
            },
          ],
        },
      ];

      const result = dataSelectorUtils.filterBy(nodes, 'match');
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('parent1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children?.[0].key).toBe('child1');
    });

    it('skips test nodes', () => {
      const nodes: MentionTreeNode[] = [
        {
          key: 'node1',
          data: {
            propertyPath: 'path1',
            displayName: 'Node 1',
            value: 'value1',
            success: true,
          },
          children: [
            {
              key: 'test_node1',
              data: {
                propertyPath: 'path1',
                displayName: 'Node 1',
                isTestStepNode: true,
                value: 'match this',
                success: null,
              },
            },
          ],
        },
      ];

      const result = dataSelectorUtils.filterBy(nodes, 'match');
      expect(result).toHaveLength(0);
    });
  });

  describe('hasStepSampleData', () => {
    it('returns false when step is undefined', () => {
      const result = dataSelectorUtils.hasStepSampleData(undefined);
      expect(result).toBe(false);
    });

    it('returns false when step has no settings', () => {
      const step = { name: 'test' };
      const result = dataSelectorUtils.hasStepSampleData(step as any);
      expect(result).toBe(false);
    });

    it('returns false when step has no inputUiInfo', () => {
      const step = { name: 'test', settings: {} };
      const result = dataSelectorUtils.hasStepSampleData(step as any);
      expect(result).toBe(false);
    });

    it('returns false when sampleData is undefined', () => {
      const step = {
        name: 'test',
        settings: { inputUiInfo: {} },
      };
      const result = dataSelectorUtils.hasStepSampleData(step as any);
      expect(result).toBe(false);
    });

    it('returns false when sampleData is null', () => {
      const step = {
        name: 'test',
        settings: { inputUiInfo: { sampleData: null } },
      };
      const result = dataSelectorUtils.hasStepSampleData(step as any);
      expect(result).toBe(false);
    });

    it('returns false when sampleData is an empty object', () => {
      const step = {
        name: 'test',
        settings: { inputUiInfo: { sampleData: {} } },
      };
      const result = dataSelectorUtils.hasStepSampleData(step as any);
      expect(result).toBe(false);
    });

    it('returns true when sampleData is a non-empty object', () => {
      const step = {
        name: 'test',
        settings: { inputUiInfo: { sampleData: { foo: 'bar' } } },
      };
      const result = dataSelectorUtils.hasStepSampleData(step as any);
      expect(result).toBe(true);
    });

    it('returns true when sampleData is a non-object value', () => {
      const step = {
        name: 'test',
        settings: { inputUiInfo: { sampleData: 'test value' } },
      };
      const result = dataSelectorUtils.hasStepSampleData(step as any);
      expect(result).toBe(true);
    });
  });
});
