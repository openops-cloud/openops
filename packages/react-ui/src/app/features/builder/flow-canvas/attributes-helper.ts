import {
  PLUS_CONTEXT_MENU_ATTRIBUTE,
  PLUS_CONTEXT_MENU_BRANCH_NODE_ID_ATTRIBUTE,
  PLUS_CONTEXT_MENU_PARENT_ATTRIBUTE,
  PLUS_CONTEXT_MENU_STEP_LOCATION_ATTRIBUTE,
} from '@openops/components/ui';
import { StepLocationRelativeToParent } from '@openops/shared';

export const attributesHelper = {
  addPlusButtonAttribute: (
    parentStep: string,
    stepLocationRelativeToParent: StepLocationRelativeToParent,
    branchNodeId?: string,
  ) => {
    return {
      [`data-${PLUS_CONTEXT_MENU_ATTRIBUTE}`]: 'plus-button',
      [`data-${PLUS_CONTEXT_MENU_PARENT_ATTRIBUTE}`]: parentStep,
      [`data-${PLUS_CONTEXT_MENU_STEP_LOCATION_ATTRIBUTE}`]:
        stepLocationRelativeToParent,
      [`data-${PLUS_CONTEXT_MENU_BRANCH_NODE_ID_ATTRIBUTE}`]: branchNodeId,
    };
  },
};
