import { TriggerType } from '@openops/shared';
import {
  flowCanvasUtils,
  WorkflowNode,
  WorkflowNodeType,
} from './flow-canvas-utils';

import {
  mockFlowVersionWithBranch,
  mockFlowVersionWithLoop,
  mockFlowVersionWithSplit,
} from './mockFlowVersion';

jest.mock('i18next', () => ({
  t: (key: string) => key,
}));

export const checkNonSelectableNodes = (nodes: WorkflowNode[]) => {
  nodes
    .filter((node) => {
      return (
        node.type === WorkflowNodeType.PLACEHOLDER ||
        node.type === WorkflowNodeType.LOOP_PLACEHOLDER ||
        node.type === WorkflowNodeType.BIG_BUTTON ||
        node.type === WorkflowNodeType.BRANCH_LABEL ||
        node.data.step?.type === TriggerType.EMPTY ||
        node.data.step?.type === TriggerType.BLOCK
      );
    })
    .forEach((node) => {
      expect(node.selectable).toEqual(false);
    });
};

describe('flowCanvasUtils', () => {
  describe('convertFlowVersionToGraph', () => {
    describe('Branch/Condition', () => {
      it('should convert flow version to graph with correct nodes', () => {
        const result = flowCanvasUtils.convertFlowVersionToGraph(
          mockFlowVersionWithBranch,
        );

        const expectedResultNodes = [
          {
            step: {
              displayName: 'Select Trigger',
              name: 'trigger',
              nextAction: {
                displayName: 'Condition',
                name: 'step_1',
                settings: {
                  conditions: [
                    [
                      {
                        caseSensitive: false,
                        firstValue: '',
                        operator: 'TEXT_CONTAINS',
                        secondValue: '',
                      },
                    ],
                  ],
                  inputUiInfo: { customizedInputs: {} },
                },
                type: 'BRANCH',
                valid: false,
              },
              settings: {},
              type: 'EMPTY',
              valid: false,
            },
          },
          {
            step: {
              displayName: 'Condition',
              name: 'step_1',
              settings: {
                conditions: [
                  [
                    {
                      caseSensitive: false,
                      firstValue: '',
                      operator: 'TEXT_CONTAINS',
                      secondValue: '',
                    },
                  ],
                ],
                inputUiInfo: { customizedInputs: {} },
              },
              type: 'BRANCH',
              valid: false,
            },
          },
          {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'INSIDE_TRUE_BRANCH',
          },
          {
            isDefaultBranch: false,
            label: 'True',
          },
          {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'INSIDE_FALSE_BRANCH',
          },
          {
            isDefaultBranch: false,
            label: 'False',
          },
          {},
        ];

        expect(result.nodes.map((x) => x.data)).toEqual(expectedResultNodes);
        checkNonSelectableNodes(result.nodes);
      });

      it('should convert flow version to graph with correct edges', () => {
        const result = flowCanvasUtils.convertFlowVersionToGraph(
          mockFlowVersionWithBranch,
        );

        const expectedResultEdges = [
          {
            parentStep: 'trigger',
            stepLocationRelativeToParent: 'AFTER',
            addButton: true,
            targetType: 'stepNode',
          },
          {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'INSIDE_TRUE_BRANCH',
            addButton: false,
            targetType: 'bigButton',
          },
          {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'AFTER',
            addButton: true,
            targetType: 'placeholder',
          },
          {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'INSIDE_FALSE_BRANCH',
            addButton: false,
            targetType: 'bigButton',
          },
          {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'AFTER',
            addButton: true,
            targetType: 'placeholder',
          },
        ];

        expect(result.edges.map((x) => x.data)).toEqual(expectedResultEdges);
        checkNonSelectableNodes(result.nodes);
      });
    });

    describe('Loop', () => {
      it('should convert flow version to graph with correct nodes', () => {
        const result = flowCanvasUtils.convertFlowVersionToGraph(
          mockFlowVersionWithLoop,
        );

        const expectedResultNodes = [
          {
            step: {
              name: 'trigger',
              valid: false,
              displayName: 'Select Trigger',
              type: 'EMPTY',
              settings: {},
              nextAction: {
                name: 'step_1',
                type: 'LOOP_ON_ITEMS',
                valid: false,
                settings: { items: '', inputUiInfo: { customizedInputs: {} } },
                nextAction: {
                  name: 'step_2',
                  type: 'CODE',
                  valid: true,
                  settings: {
                    input: {},
                    sourceCode: {
                      code: 'export const code = async (inputs) => {\n  return true;\n};',
                      packageJson: '{}',
                    },
                    inputUiInfo: { customizedInputs: {} },
                    errorHandlingOptions: {
                      retryOnFailure: { value: false },
                      continueOnFailure: { value: false },
                    },
                  },
                  nextAction: {
                    name: 'step_3',
                    type: 'LOOP_ON_ITEMS',
                    valid: false,
                    settings: {
                      items: '',
                      inputUiInfo: { customizedInputs: {} },
                    },
                    displayName: 'Loop on Items',
                    firstLoopAction: {
                      name: 'step_4',
                      type: 'CODE',
                      valid: true,
                      settings: {
                        input: {},
                        sourceCode: {
                          code: 'export const code = async (inputs) => {\n  return true;\n};',
                          packageJson: '{}',
                        },
                        inputUiInfo: { customizedInputs: {} },
                        errorHandlingOptions: {
                          retryOnFailure: { value: false },
                          continueOnFailure: { value: false },
                        },
                      },
                      displayName: 'Custom TypeScript Code',
                    },
                  },
                  displayName: 'Custom TypeScript Code',
                },
                displayName: 'Loop on Items',
              },
            },
          },
          {
            step: {
              name: 'step_1',
              type: 'LOOP_ON_ITEMS',
              valid: false,
              settings: { items: '', inputUiInfo: { customizedInputs: {} } },
              nextAction: {
                name: 'step_2',
                type: 'CODE',
                valid: true,
                settings: {
                  input: {},
                  sourceCode: {
                    code: 'export const code = async (inputs) => {\n  return true;\n};',
                    packageJson: '{}',
                  },
                  inputUiInfo: { customizedInputs: {} },
                  errorHandlingOptions: {
                    retryOnFailure: { value: false },
                    continueOnFailure: { value: false },
                  },
                },
                nextAction: {
                  name: 'step_3',
                  type: 'LOOP_ON_ITEMS',
                  valid: false,
                  settings: {
                    items: '',
                    inputUiInfo: { customizedInputs: {} },
                  },
                  displayName: 'Loop on Items',
                  firstLoopAction: {
                    name: 'step_4',
                    type: 'CODE',
                    valid: true,
                    settings: {
                      input: {},
                      sourceCode: {
                        code: 'export const code = async (inputs) => {\n  return true;\n};',
                        packageJson: '{}',
                      },
                      inputUiInfo: { customizedInputs: {} },
                      errorHandlingOptions: {
                        retryOnFailure: { value: false },
                        continueOnFailure: { value: false },
                      },
                    },
                    displayName: 'Custom TypeScript Code',
                  },
                },
                displayName: 'Custom TypeScript Code',
              },
              displayName: 'Loop on Items',
            },
          },
          {},
          { parentStep: 'step_1', stepLocationRelativeToParent: 'INSIDE_LOOP' },
          {
            step: {
              name: 'step_2',
              type: 'CODE',
              valid: true,
              settings: {
                input: {},
                sourceCode: {
                  code: 'export const code = async (inputs) => {\n  return true;\n};',
                  packageJson: '{}',
                },
                inputUiInfo: { customizedInputs: {} },
                errorHandlingOptions: {
                  retryOnFailure: { value: false },
                  continueOnFailure: { value: false },
                },
              },
              nextAction: {
                name: 'step_3',
                type: 'LOOP_ON_ITEMS',
                valid: false,
                settings: { items: '', inputUiInfo: { customizedInputs: {} } },
                displayName: 'Loop on Items',
                firstLoopAction: {
                  name: 'step_4',
                  type: 'CODE',
                  valid: true,
                  settings: {
                    input: {},
                    sourceCode: {
                      code: 'export const code = async (inputs) => {\n  return true;\n};',
                      packageJson: '{}',
                    },
                    inputUiInfo: { customizedInputs: {} },
                    errorHandlingOptions: {
                      retryOnFailure: { value: false },
                      continueOnFailure: { value: false },
                    },
                  },
                  displayName: 'Custom TypeScript Code',
                },
              },
              displayName: 'Custom TypeScript Code',
            },
          },
          {
            step: {
              name: 'step_3',
              type: 'LOOP_ON_ITEMS',
              valid: false,
              settings: { items: '', inputUiInfo: { customizedInputs: {} } },
              displayName: 'Loop on Items',
              firstLoopAction: {
                name: 'step_4',
                type: 'CODE',
                valid: true,
                settings: {
                  input: {},
                  sourceCode: {
                    code: 'export const code = async (inputs) => {\n  return true;\n};',
                    packageJson: '{}',
                  },
                  inputUiInfo: { customizedInputs: {} },
                  errorHandlingOptions: {
                    retryOnFailure: { value: false },
                    continueOnFailure: { value: false },
                  },
                },
                displayName: 'Custom TypeScript Code',
              },
            },
          },
          {},
          {
            step: {
              name: 'step_4',
              type: 'CODE',
              valid: true,
              settings: {
                input: {},
                sourceCode: {
                  code: 'export const code = async (inputs) => {\n  return true;\n};',
                  packageJson: '{}',
                },
                inputUiInfo: { customizedInputs: {} },
                errorHandlingOptions: {
                  retryOnFailure: { value: false },
                  continueOnFailure: { value: false },
                },
              },
              displayName: 'Custom TypeScript Code',
            },
          },
          {},
          {},
        ];
        expect(result.nodes.map((x) => x.data)).toEqual(expectedResultNodes);
        checkNonSelectableNodes(result.nodes);
      });
    });

    describe('Split', () => {
      it('should convert flow version to graph with correct nodes', () => {
        const result = flowCanvasUtils.convertFlowVersionToGraph(
          mockFlowVersionWithSplit,
        );

        const expectedResultNodes = [
          {
            step: {
              name: 'trigger',
              type: 'EMPTY',
              valid: false,
              settings: {},
              nextAction: {
                name: 'step_1',
                type: 'SPLIT',
                valid: true,
                branches: [],
                settings: {
                  options: [
                    {
                      id: 'l1oGme34T2HzW-DdOPC6C',
                      name: 'Branch 1',
                      conditions: [
                        [
                          {
                            operator: 'TEXT_EXACTLY_MATCHES',
                            firstValue: '',
                            secondValue: '',
                            caseSensitive: false,
                          },
                        ],
                      ],
                    },
                    {
                      id: 'PYE3ImwaEw4i8dbRZCJQv',
                      name: 'Branch 2',
                      conditions: [
                        [
                          {
                            operator: 'TEXT_EXACTLY_MATCHES',
                            firstValue: '',
                            secondValue: '',
                            caseSensitive: false,
                          },
                        ],
                      ],
                    },
                  ],
                  inputUiInfo: {
                    customizedInputs: {},
                  },
                  defaultBranch: '',
                },
                displayName: 'Split',
              },
              displayName: 'Select Trigger',
            },
          },
          {
            step: {
              name: 'step_1',
              type: 'SPLIT',
              valid: true,
              branches: [],
              settings: {
                options: [
                  {
                    id: 'l1oGme34T2HzW-DdOPC6C',
                    name: 'Branch 1',
                    conditions: [
                      [
                        {
                          operator: 'TEXT_EXACTLY_MATCHES',
                          firstValue: '',
                          secondValue: '',
                          caseSensitive: false,
                        },
                      ],
                    ],
                  },
                  {
                    id: 'PYE3ImwaEw4i8dbRZCJQv',
                    name: 'Branch 2',
                    conditions: [
                      [
                        {
                          operator: 'TEXT_EXACTLY_MATCHES',
                          firstValue: '',
                          secondValue: '',
                          caseSensitive: false,
                        },
                      ],
                    ],
                  },
                ],
                inputUiInfo: {
                  customizedInputs: {},
                },
                defaultBranch: '',
              },
              displayName: 'Split',
            },
          },
          {
            branchNodeId: 'l1oGme34T2HzW-DdOPC6C',
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'INSIDE_SPLIT',
          },
          {
            isDefaultBranch: false,
            label: 'Branch 1',
          },
          {
            branchNodeId: 'PYE3ImwaEw4i8dbRZCJQv',
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'INSIDE_SPLIT',
          },
          {
            isDefaultBranch: false,
            label: 'Branch 2',
          },
          {},
        ];

        expect(result.nodes.map((x) => x.data)).toEqual(expectedResultNodes);
        checkNonSelectableNodes(result.nodes);
      });

      it('should convert flow version to graph with correct edges', () => {
        const result = flowCanvasUtils.convertFlowVersionToGraph(
          mockFlowVersionWithSplit,
        );

        const expectedResultEdges = [
          {
            parentStep: 'trigger',
            stepLocationRelativeToParent: 'AFTER',
            addButton: true,
            targetType: 'stepNode',
          },
          {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'INSIDE_SPLIT',
            addButton: false,
            targetType: 'bigButton',
          },
          {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'AFTER',
            addButton: true,
            targetType: 'placeholder',
          },
          {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'INSIDE_SPLIT',
            addButton: false,
            targetType: 'bigButton',
          },
          {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'AFTER',
            addButton: true,
            targetType: 'placeholder',
          },
        ];

        expect(result.edges.map((x) => x.data)).toEqual(expectedResultEdges);
        checkNonSelectableNodes(result.nodes);
      });

      it('should convert flow version to graph with correct edges when has uneven number of branches', () => {
        const result = flowCanvasUtils.convertFlowVersionToGraph({
          ...mockFlowVersionWithSplit,
          trigger: {
            ...mockFlowVersionWithSplit.trigger,
            nextAction: {
              ...mockFlowVersionWithSplit.trigger.nextAction,
              settings: {
                ...mockFlowVersionWithSplit.trigger.nextAction.settings,
                options: [
                  {
                    id: 'l1oGme34T2HzW-DdOPC6C',
                    name: 'Branch 1',
                    conditions: [],
                  },
                  {
                    id: 'PYE3ImwaEw4i8dbRZCJQv',
                    name: 'Branch 2',
                    conditions: [],
                  },
                  {
                    id: 'PYE3ImwaEw4i8dbRZCJQv',
                    name: 'Branch 3',
                    conditions: [],
                  },
                ],
              },
            },
          },
        });

        const expectedResultEdges = [
          {
            parentStep: 'trigger',
            stepLocationRelativeToParent: 'AFTER',
            addButton: true,
            targetType: 'stepNode',
          },
          {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'INSIDE_SPLIT',
            addButton: false,
            targetType: 'bigButton',
          },
          {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'AFTER',
            addButton: true,
            targetType: 'placeholder',
          },
          {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'INSIDE_SPLIT',
            addButton: false,
            targetType: 'bigButton',
          },
          {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'AFTER',
            addButton: false,
            targetType: 'placeholder',
          },
          {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'INSIDE_SPLIT',
            addButton: false,
            targetType: 'bigButton',
          },
          {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'AFTER',
            addButton: true,
            targetType: 'placeholder',
          },
        ];

        expect(result.edges.map((x) => x.data)).toEqual(expectedResultEdges);
        checkNonSelectableNodes(result.nodes);
      });
    });
  });
  describe('convertFlowVersionToGraph (collapsed mode)', () => {
    it('collapsing a BRANCH node draws only one AFTER edge', () => {
      const collapsed = new Set<string>(['step_1']);
      const result = flowCanvasUtils.convertFlowVersionToGraph(
        mockFlowVersionWithBranch,
        { collapsedSteps: collapsed },
      );

      const edgesFromStep1 = result.edges
        .filter((e) => e.source === 'step_1')
        .map((e) => e.data);

      expect(edgesFromStep1).toHaveLength(1);
      expect(edgesFromStep1[0].stepLocationRelativeToParent).toBe('AFTER');

      expect(
        result.edges.some(
          (e) =>
            e.source === 'step_1' &&
            (e.data.stepLocationRelativeToParent === 'INSIDE_TRUE_BRANCH' ||
              e.data.stepLocationRelativeToParent === 'INSIDE_FALSE_BRANCH'),
        ),
      ).toBe(false);

      expect(
        result.nodes.some((n) => n.type === WorkflowNodeType.BRANCH_LABEL),
      ).toBe(false);

      expect(
        result.nodes.some(
          (n) =>
            n.type === WorkflowNodeType.BIG_BUTTON &&
            n.data?.parentStep === 'step_1',
        ),
      ).toBe(false);
    });

    it('collapsing a SPLIT node draws only one AFTER edge', () => {
      const collapsed = new Set<string>(['step_1']); // collapse the split node
      const result = flowCanvasUtils.convertFlowVersionToGraph(
        mockFlowVersionWithSplit,
        { collapsedSteps: collapsed },
      );

      const edgesFromStep1 = result.edges
        .filter((e) => e.source === 'step_1')
        .map((e) => e.data);

      expect(edgesFromStep1).toHaveLength(1);
      expect(edgesFromStep1[0].stepLocationRelativeToParent).toBe('AFTER');

      expect(
        result.edges.some(
          (e) =>
            e.source === 'step_1' &&
            e.data.stepLocationRelativeToParent === 'INSIDE_SPLIT',
        ),
      ).toBe(false);

      expect(
        result.nodes.some((n) => n.type === WorkflowNodeType.BRANCH_LABEL),
      ).toBe(false);
      expect(
        result.nodes.some(
          (n) =>
            n.type === WorkflowNodeType.BIG_BUTTON &&
            n.data?.parentStep === 'step_1',
        ),
      ).toBe(false);
    });

    it('collapsing a LOOP node draws only one AFTER edge', () => {
      const collapsed = new Set<string>(['step_1']);
      const result = flowCanvasUtils.convertFlowVersionToGraph(
        mockFlowVersionWithLoop,
        { collapsedSteps: collapsed },
      );

      const edgesFromStep1 = result.edges
        .filter((e) => e.source === 'step_1')
        .map((e) => e.data);

      expect(edgesFromStep1).toHaveLength(1);
      expect(edgesFromStep1[0].stepLocationRelativeToParent).toBe('AFTER');

      expect(
        result.edges.some(
          (e) =>
            e.source === 'step_1' && e.data.targetType === 'loopPlaceholder',
        ),
      ).toBe(false);
    });
  });
});
