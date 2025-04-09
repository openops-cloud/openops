import { BlockStepMetadata, StepMetadata } from '@openops/components/ui';
import {
  Action,
  ActionType,
  BlockAction,
  BlockTrigger,
  BranchOperator,
  CodeAction,
  deepMergeAndCast,
  flowHelper,
  FlowVersion,
  Trigger,
  TriggerType,
} from '@openops/shared';

import { createDefaultOptionSettings } from '../step-settings/split-settings/utils';

const defaultCode = `export const code = async (inputs) => {
  return true;
};`;

function toKey(stepMetadata: StepMetadata): string {
  switch (stepMetadata.type) {
    case ActionType.BLOCK:
    case TriggerType.BLOCK: {
      const blockMetadata: BlockStepMetadata =
        stepMetadata as BlockStepMetadata;
      return `${stepMetadata.type}-${blockMetadata.blockName}-${blockMetadata.blockVersion}`;
    }
    default:
      return stepMetadata.type.toLowerCase();
  }
}

const getStepName = (block: StepMetadata, flowVersion: FlowVersion) => {
  if (block.type === TriggerType.BLOCK) {
    return 'trigger';
  }
  const baseName = 'step_';
  let number = 1;
  const steps = flowHelper.getAllSteps(flowVersion.trigger);
  while (steps.some((step) => step.name === `${baseName}${number}`)) {
    number++;
  }
  return `${baseName}${number}`;
};

const getDefaultStep = ({
  stepName,
  block,
  actionOrTriggerName,
  displayName,
}: {
  stepName: string;
  block: StepMetadata;
  displayName: string;
  actionOrTriggerName?: string;
}): Action | Trigger => {
  const errorHandlingOptions = {
    continueOnFailure: {
      hide: true,
      value: false,
    },
    retryOnFailure: {
      hide: true,
      value: false,
    },
  };
  const common = {
    name: stepName,
    valid:
      block.type === ActionType.CODE || block.type === ActionType.LOOP_ON_ITEMS,
    displayName: displayName,
    settings: {
      inputUiInfo: {
        customizedInputs: {},
      },
    },
  };

  switch (block.type) {
    case ActionType.CODE:
      return deepMergeAndCast<CodeAction>(
        {
          type: ActionType.CODE,
          settings: {
            sourceCode: {
              code: defaultCode,
              packageJson: '{}',
            },
            input: {},
            inputUiInfo: {
              customizedInputs: {},
            },
            errorHandlingOptions: errorHandlingOptions,
          },
        },
        common,
      );
    case ActionType.LOOP_ON_ITEMS:
      return deepMergeAndCast<Action>(
        {
          type: ActionType.LOOP_ON_ITEMS,
          settings: {
            items: '',
            inputUiInfo: {
              customizedInputs: {},
            },
          },
        },
        common,
      );
    case ActionType.BRANCH:
      return deepMergeAndCast<Action>(
        {
          type: ActionType.BRANCH,
          settings: {
            conditions: [
              [
                {
                  firstValue: '',
                  operator: BranchOperator.TEXT_CONTAINS,
                  secondValue: '',
                  caseSensitive: false,
                },
              ],
            ],
          },
        },
        common,
      );
    case ActionType.SPLIT: {
      const defaultOptions = createDefaultOptionSettings();
      const defaultBranch = defaultOptions[0].id;

      return deepMergeAndCast<Action>(
        {
          type: ActionType.SPLIT,
          settings: {
            defaultBranch: defaultBranch,
            options: defaultOptions,
          },
          branches: defaultOptions.map((option) => {
            return {
              optionId: option.id,
            };
          }),
        },
        common,
      );
    }
    case ActionType.BLOCK: {
      const blockStepMetadata = block as BlockStepMetadata;

      return deepMergeAndCast<BlockAction>(
        {
          type: ActionType.BLOCK,
          settings: {
            blockName: blockStepMetadata.blockName,
            blockType: blockStepMetadata.blockType,
            packageType: blockStepMetadata.packageType,
            actionName: actionOrTriggerName,
            blockVersion: blockStepMetadata.blockVersion,
            input: {},
            errorHandlingOptions: errorHandlingOptions,
          },
        },
        common,
      );
    }
    case TriggerType.BLOCK: {
      const blockStepMetadata = block as BlockStepMetadata;
      return deepMergeAndCast<BlockTrigger>(
        {
          type: TriggerType.BLOCK,
          settings: {
            blockName: blockStepMetadata.blockName,
            blockType: blockStepMetadata.blockType,
            packageType: blockStepMetadata.packageType,
            triggerName: actionOrTriggerName,
            blockVersion: blockStepMetadata.blockVersion,
            input: {},
          },
        },
        common,
      );
    }
    default:
      throw new Error('Unsupported type: ' + block.type);
  }
};

export const blockSelectorUtils = {
  getDefaultStep,
  getStepName,
  toKey,
};
