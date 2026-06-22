import { ActionType, StepWithIndex, TriggerType } from '@openops/shared';
import { dataSelectorUtils, MentionTreeNode } from '../data-selector-utils';

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

  describe('traverseStepOutputAndReturnMentionTree — large arrays (>100 items)', () => {
    it('slices arrays larger than 100 items into child slice nodes', () => {
      const items = Array.from({ length: 150 }, (_, i) => `item-${i}`);
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: items,
        success: true,
        propertyPath: 'step1',
        displayName: 'Step 1',
      });

      expect(node.children).toHaveLength(2);
      expect(node.children?.every((c) => c.data.isSlice)).toBe(true);
    });

    it('parent node of a large array has value undefined to avoid expensive serialization during search', () => {
      const items = Array.from({ length: 150 }, (_, i) => i);
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: items,
        success: null,
        propertyPath: 'step1',
        displayName: 'Step 1',
      });

      expect(node.data.value).toBeUndefined();
    });

    it('arrays with exactly 100 items are not sliced', () => {
      const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: items,
        success: true,
        propertyPath: 'step1',
        displayName: 'Step 1',
      });

      expect(node.children).toHaveLength(100);
      expect(node.children?.every((c) => !c.data.isSlice)).toBe(true);
    });

    it('slice display names reflect correct index ranges', () => {
      const items = Array.from({ length: 250 }, (_, i) => i);
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: items,
        success: null,
        propertyPath: 'step1',
        displayName: 'Results',
      });

      const sliceNames = node.children?.map((c) => c.data.displayName);
      expect(sliceNames).toEqual([
        'Results 0-99',
        'Results 100-199',
        'Results 200-249',
      ]);
    });

    it('property paths in sliced items use correct global indices', () => {
      const items = Array.from({ length: 150 }, (_, i) => `val-${i}`);
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: items,
        success: null,
        propertyPath: 'step1',
        displayName: 'Items',
      });

      // first item of first slice → index 0
      const firstSlice = node.children?.[0];
      expect(firstSlice?.children?.[0].data.propertyPath).toBe('step1[0]');

      // first item of second slice → index 100
      const secondSlice = node.children?.[1];
      expect(secondSlice?.children?.[0].data.propertyPath).toBe('step1[100]');
    });

    it('leaf values inside slices are preserved', () => {
      const items = Array.from({ length: 150 }, (_, i) => `val-${i}`);
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: items,
        success: null,
        propertyPath: 'step1',
        displayName: 'Items',
      });

      const firstSlice = node.children?.[0];
      expect(firstSlice?.children?.[0].data.value).toBe('val-0');

      const secondSlice = node.children?.[1];
      expect(secondSlice?.children?.[0].data.value).toBe('val-100');
    });

    it('no items are lost across slices — total equals original array length', () => {
      const items = Array.from({ length: 150 }, (_, i) => `val-${i}`);
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: items,
        success: null,
        propertyPath: 'step1',
        displayName: 'Items',
      });

      const totalItems = node.children?.reduce(
        (sum, slice) => sum + (slice.children?.length ?? 0),
        0,
      );
      expect(totalItems).toBe(150);
    });

    it('last item of the first slice has the correct value and property path', () => {
      const items = Array.from({ length: 150 }, (_, i) => `val-${i}`);
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: items,
        success: null,
        propertyPath: 'step1',
        displayName: 'Items',
      });

      const firstSlice = node.children?.[0];
      const lastItem = firstSlice?.children?.[firstSlice.children.length - 1];
      expect(lastItem?.data.value).toBe('val-99');
      expect(lastItem?.data.propertyPath).toBe('step1[99]');
    });
  });

  describe('filterBy — output correctness and input stability', () => {
    it('does not modify the input array or its nodes when a query is provided', () => {
      const nodes: MentionTreeNode[] = [
        {
          key: 'parent',
          data: { propertyPath: 'p', displayName: 'Parent' },
          children: [
            {
              key: 'child-match',
              data: {
                propertyPath: 'p.c1',
                displayName: 'Match',
                value: 'found',
              },
            },
            {
              key: 'child-no-match',
              data: {
                propertyPath: 'p.c2',
                displayName: 'Skip',
                value: 'nope',
              },
            },
          ],
        },
      ];

      const snapshotBefore = JSON.stringify(nodes);
      dataSelectorUtils.filterBy(nodes, 'found');

      expect(JSON.stringify(nodes)).toBe(snapshotBefore);
    });

    it('returns the same reference when query is empty', () => {
      const nodes: MentionTreeNode[] = [
        {
          key: 'n1',
          data: { propertyPath: 'p1', displayName: 'N1', value: 'v1' },
        },
      ];

      const result = dataSelectorUtils.filterBy(nodes, '');
      expect(result).toBe(nodes);
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

    it('returns true when sampleData is a non-empty array', () => {
      const step = {
        name: 'test',
        settings: { inputUiInfo: { sampleData: [1, 2, 3] } },
      };
      const result = dataSelectorUtils.hasStepSampleData(step as any);
      expect(result).toBe(true);
    });

    it('returns false when sampleData is an empty array', () => {
      const step = {
        name: 'test',
        settings: { inputUiInfo: { sampleData: [] } },
      };
      const result = dataSelectorUtils.hasStepSampleData(step as any);
      expect(result).toBe(false);
    });
  });

  describe('traverseStepOutputAndReturnMentionTree — primitive and empty inputs', () => {
    it('returns a leaf node for a string value', () => {
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: 'hello',
        success: true,
        propertyPath: 'step1',
        displayName: 'Step 1',
      });
      expect(node.data.value).toBe('hello');
      expect(node.data.propertyPath).toBe('step1');
      expect(node.data.displayName).toBe('Step 1');
      expect(node.children).toBeUndefined();
    });

    it('returns a leaf node for a number value', () => {
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: 42,
        success: true,
        propertyPath: 'step1',
        displayName: 'Step 1',
      });
      expect(node.data.value).toBe(42);
      expect(node.children).toBeUndefined();
    });

    it('returns a leaf node for a boolean value', () => {
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: false,
        success: null,
        propertyPath: 'step1',
        displayName: 'Step 1',
      });
      expect(node.data.value).toBe(false);
      expect(node.children).toBeUndefined();
    });

    it('returns a leaf node for null', () => {
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: null,
        success: null,
        propertyPath: 'step1',
        displayName: 'Step 1',
      });
      expect(node.data.value).toBeNull();
      expect(node.children).toBeUndefined();
    });

    it('returns Empty List for an empty array', () => {
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: [],
        success: null,
        propertyPath: 'step1',
        displayName: 'Step 1',
      });
      expect(node.data.value).toBe('Empty List');
      expect(node.children).toEqual([]);
    });

    it('returns Empty List for an empty object', () => {
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: {},
        success: null,
        propertyPath: 'step1',
        displayName: 'Step 1',
      });
      expect(node.data.value).toBe('Empty List');
      expect(node.children).toEqual([]);
    });
  });

  describe('traverseStepOutputAndReturnMentionTree — object key escaping', () => {
    it('escapes single quotes in object keys', () => {
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: { "it's a key": 'value' },
        success: null,
        propertyPath: 'step1',
        displayName: 'Step 1',
      });
      expect(node.children?.[0].data.propertyPath).toBe(
        "step1['it\\'s a key']",
      );
    });

    it('escapes double quotes in object keys', () => {
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: { 'say "hello"': 'value' },
        success: null,
        propertyPath: 'step1',
        displayName: 'Step 1',
      });
      expect(node.children?.[0].data.propertyPath).toBe(
        'step1[\'say \\"hello\\"\']',
      );
    });

    it('escapes backslashes in object keys', () => {
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: { 'path\\to': 'value' },
        success: null,
        propertyPath: 'step1',
        displayName: 'Step 1',
      });
      expect(node.children?.[0].data.propertyPath).toBe("step1['path\\\\to']");
    });

    it('escapes newline characters in object keys', () => {
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: { 'line1\nline2': 'value' },
        success: null,
        propertyPath: 'step1',
        displayName: 'Step 1',
      });
      // regex escapes `\n` to backslash + literal newline char
      expect(node.children?.[0].data.propertyPath).toBe(
        "step1['line1\\\nline2']",
      );
    });

    it('does not escape plain alphanumeric keys', () => {
      const node = dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
        stepOutput: { normalKey: 'value' },
        success: null,
        propertyPath: 'step1',
        displayName: 'Step 1',
      });
      expect(node.children?.[0].data.propertyPath).toBe("step1['normalKey']");
      expect(node.children?.[0].data.displayName).toBe('normalKey');
    });
  });

  describe('filterBy — additional edge cases', () => {
    it('includes parent with no matching children when parent displayName matches', () => {
      const nodes: MentionTreeNode[] = [
        {
          key: 'parent',
          data: {
            propertyPath: 'p',
            displayName: 'MatchParent',
            value: 'parent-value',
          },
          children: [
            {
              key: 'child',
              data: {
                propertyPath: 'p.c',
                displayName: 'NoMatch',
                value: 'unrelated',
              },
            },
          ],
        },
      ];

      const result = dataSelectorUtils.filterBy(nodes, 'MatchParent');
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('parent');
      expect(result[0].children).toBeUndefined();
    });

    it('matches nodes whose value is an object by JSON stringifying it', () => {
      const nodes: MentionTreeNode[] = [
        {
          key: 'node1',
          data: {
            propertyPath: 'p1',
            displayName: 'Node 1',
            value: { nested: 'findme' },
          },
        },
        {
          key: 'node2',
          data: {
            propertyPath: 'p2',
            displayName: 'Node 2',
            value: { nested: 'other' },
          },
        },
      ];

      const result = dataSelectorUtils.filterBy(nodes, 'findme');
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('node1');
    });

    it('excludes nodes with no value and non-matching displayName', () => {
      const nodes: MentionTreeNode[] = [
        {
          key: 'node1',
          data: { propertyPath: 'p1', displayName: 'Alpha' },
        },
        {
          key: 'node2',
          data: { propertyPath: 'p2', displayName: 'Beta' },
        },
      ];

      const result = dataSelectorUtils.filterBy(nodes, 'gamma');
      expect(result).toHaveLength(0);
    });
  });

  describe('getAllStepsMentions — additional edge cases', () => {
    it('returns a test node when step has no id', () => {
      const stepWithNoId = {
        name: 'step1',
        displayName: 'Step 1',
        type: TriggerType.BLOCK,
        settings: {},
        valid: true,
        dfsIndex: 0,
      } as StepWithIndex;

      const result = dataSelectorUtils.getAllStepsMentions([stepWithNoId], {
        step1: {
          input: {},
          output: { foo: 'bar' },
          lastTestDate: '2024-01-01',
          success: true,
        },
      });

      expect(result[0].children?.[0].data.isTestStepNode).toBe(true);
    });

    it('uses sample data when step needs testing but has sample data', () => {
      const stepWithSampleData = {
        id: 'step1',
        name: 'step1',
        displayName: 'Step 1',
        type: TriggerType.BLOCK,
        settings: {
          inputUiInfo: {
            sampleData: { account: 'aws-prod' },
          },
        },
        valid: true,
        dfsIndex: 0,
      } as StepWithIndex;

      const result = dataSelectorUtils.getAllStepsMentions(
        [stepWithSampleData],
        {
          step1: {
            input: {},
            output: {},
            lastTestDate: undefined as any,
            success: null,
          },
        },
      );

      // Should use sample data tree, not a test node
      expect(result[0].children?.[0].data.isTestStepNode).toBeUndefined();
      expect(result[0].children?.[0].data.displayName).toBe('account');
      expect(result[0].children?.[0].data.value).toBe('aws-prod');
    });
  });
});
