import { ActionType, Trigger, TriggerType } from '@openops/shared';

const template: Trigger = {
  name: 'trigger',
  valid: false,
  displayName: 'Select Trigger',
  type: TriggerType.EMPTY,
  settings: {},
  nextAction: {
    name: 'step_1',
    type: ActionType.LOOP_ON_ITEMS,
    valid: true,
    settings: {
      items: '',
      inputUiInfo: {
        customizedInputs: {},
      },
    },
    displayName: 'Loop on Items',
    firstLoopAction: {
      name: 'step_2',
      type: ActionType.BRANCH,
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
      onFailureAction: {
        name: 'step_3',
        type: ActionType.SPLIT,
        valid: true,
        branches: [
          {
            optionId: 'KGTmb8CEYs8sixovYNybM',
            nextAction: {
              name: 'step_4',
              type: ActionType.CODE,
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
        ],
        settings: {
          options: [
            {
              id: 'kbMQNGRypXvamildod15l',
              name: 'Branch 1',
              conditions: [[]],
            },
            {
              id: 'KGTmb8CEYs8sixovYNybM',
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
            {
              id: '_-lhBWxfUpVo3vTjUEPPb',
              name: 'Branch 3',
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
          defaultBranch: 'kbMQNGRypXvamildod15l',
        },
        displayName: 'Split',
      },
    },
  },
};

export default template;
