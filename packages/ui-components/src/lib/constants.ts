import { ActionType, TriggerType } from '@openops/shared';

export const PRIMITIVE_STEP_METADATA = {
  [ActionType.CODE]: {
    displayName: 'Code',
    displayIcon: 'Code',
    description: 'Powerful Node.js & TypeScript code with npm',
    type: ActionType.CODE,
  },
  [ActionType.LOOP_ON_ITEMS]: {
    displayName: 'Loop on Items',
    displayIcon: 'RotateCw',
    description: 'Iterate over a list of items',
    type: ActionType.LOOP_ON_ITEMS,
  },
  [ActionType.BRANCH]: {
    displayName: 'Condition',
    logoUrl: 'https://static.openops.com/blocks/branch.svg',
    description: 'Split the flow into two branches depending on condition(s)',
    type: ActionType.BRANCH,
  },
  [ActionType.SPLIT]: {
    displayName: 'Split',
    displayIcon: 'Network',
    description:
      'Split the flow into multiple branches depending on condition(s). Only one branch will be executed.',
    type: ActionType.SPLIT,
  },
  [TriggerType.EMPTY]: {
    displayName: 'Empty Trigger',
    logoUrl: 'https://static.openops.com/blocks/empty-trigger.svg',
    description: 'Empty Trigger',
    type: TriggerType.EMPTY,
  },
};

export const COPY_PASTE_TOAST_DURATION = 2000;

export const AI_CHAT_SCROLL_DELAY = 200;
