import { FlowVersion, FlowVersionState, TriggerType } from '@openops/shared';

export const mockFlowVersionWithBranch: FlowVersion = {
  id: 'woAH9T8ZxDpXbTRlGYIiI',
  created: '2024-09-30T18:08:13.453Z',
  updated: '2024-10-01T09:48:50.724Z',
  flowId: 'TiocM4RQErMDSBYbYofdl',
  displayName: 'Untitled',
  trigger: {
    name: 'trigger',
    valid: false,
    displayName: 'Select Trigger',
    type: TriggerType.EMPTY,
    settings: {},
    nextAction: {
      name: 'step_1',
      type: 'BRANCH',
      valid: false,
      settings: {
        conditions: [
          [
            {
              operator: 'TEXT_CONTAINS',
              firstValue: '',
              secondValue: '',
              caseSensitive: false,
            },
          ],
        ],
        inputUiInfo: {
          customizedInputs: {},
        },
      },
      displayName: 'Condition',
    },
  },
  valid: false,
  state: FlowVersionState.DRAFT,
  updatedBy: 'fGrFR98BRLX8RV3m4MBHc',
};

export const mockFlowVersionWithSplit: FlowVersion = {
  id: 'wXSrq9WM30OgWTJFah36i',
  created: '2024-09-23T10:56:45.980Z',
  updated: '2024-09-24T09:35:21.675Z',
  flowId: 'SRH7i7LqpTdo3LmQlVQey',
  displayName: 'Untitled',
  trigger: {
    name: 'trigger',
    type: TriggerType.EMPTY,
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
  updatedBy: 'fGrFR98BRLX8RV3m4MBHc',
  valid: false,
  state: FlowVersionState.DRAFT,
};

export const mockFlowVersionWithSplitWithBranches: FlowVersion = {
  id: 'wXSrq9WM30OgWTJFah36i',
  created: '2024-09-23T10:56:45.980Z',
  updated: '2024-09-24T09:35:21.675Z',
  flowId: 'SRH7i7LqpTdo3LmQlVQey',
  displayName: 'Untitled',
  trigger: {
    name: 'trigger',
    type: TriggerType.EMPTY,
    valid: false,
    settings: {},
    nextAction: {
      name: 'step_1',
      type: 'SPLIT',
      valid: true,
      branches: [
        {
          optionId: 'l1oGme34T2HzW-DdOPC6C',
          nextAction: {
            name: 'step_2',
            type: 'CODE',
            valid: true,
            settings: {
              input: {
                key: 'value',
              },
              sourceCode: {
                code: 'test',
                packageJson: '{}',
              },
            },
            displayName: 'Code',
          },
        },
        {
          optionId: 'PYE3ImwaEw4i8dbRZCJQv',
          nextAction: null,
        },
      ],
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
  updatedBy: 'fGrFR98BRLX8RV3m4MBHc',
  valid: false,
  state: FlowVersionState.DRAFT,
};

export const mockFlowVersionWithLoop: FlowVersion = {
  id: 'EQO4peVXcMUu1T4HTY4Vr',
  created: '2025-03-18T12:46:38.492Z',
  updated: '2025-03-18T12:46:57.200Z',
  flowId: 'TG3TV63nSUT0A2f2nJXJN',
  displayName: 'Untitled',
  trigger: {
    name: 'trigger',
    valid: false,
    displayName: 'Select Trigger',
    type: TriggerType.EMPTY,
    settings: {},
    nextAction: {
      name: 'step_1',
      type: 'LOOP_ON_ITEMS',
      valid: false,
      settings: {
        items: '',
        inputUiInfo: {
          customizedInputs: {},
        },
      },
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
          inputUiInfo: {
            customizedInputs: {},
          },
          errorHandlingOptions: {
            retryOnFailure: {
              value: false,
            },
            continueOnFailure: {
              value: false,
            },
          },
        },
        nextAction: {
          name: 'step_3',
          type: 'LOOP_ON_ITEMS',
          valid: false,
          settings: {
            items: '',
            inputUiInfo: {
              customizedInputs: {},
            },
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
              inputUiInfo: {
                customizedInputs: {},
              },
              errorHandlingOptions: {
                retryOnFailure: {
                  value: false,
                },
                continueOnFailure: {
                  value: false,
                },
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
  valid: false,
  state: FlowVersionState.DRAFT,
  description: '',
  updatedBy: 'cX7k098lKcqPuhk1K0bm0',
};
