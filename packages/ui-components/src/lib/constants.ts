import { ActionType, TriggerType } from '@openops/shared';

export const PRIMITIVE_STEP_METADATA = {
  [ActionType.CODE]: {
    displayName: 'Code',
    logoUrl: '/blocks/code-block.svg',
    description: 'Powerful Node.js & TypeScript code with npm',
    type: ActionType.CODE,
  },
  [ActionType.LOOP_ON_ITEMS]: {
    displayName: 'Loop on Items',
    logoUrl: '/blocks/loop-on-items.svg',
    description: 'Iterate over a list of items',
    type: ActionType.LOOP_ON_ITEMS,
  },
  [ActionType.BRANCH]: {
    displayName: 'Condition',
    logoUrl: '/blocks/condition.svg',
    description: 'Split the flow into two branches depending on condition(s)',
    type: ActionType.BRANCH,
  },
  [ActionType.SPLIT]: {
    displayName: 'Split',
    logoUrl: '/blocks/split-branch.svg',
    description:
      'Split the flow into multiple branches depending on condition(s). Only one branch will be executed.',
    type: ActionType.SPLIT,
  },
  [TriggerType.EMPTY]: {
    displayName: 'Empty Trigger',
    logoUrl: '/blocks/openops-empty-trigger.svg',
    description: 'Empty Trigger',
    type: TriggerType.EMPTY,
  },
};

export const COPY_PASTE_TOAST_DURATION = 2000;

export const AI_CHAT_SCROLL_DELAY = 200;

export const TOP_BAR_HEIGHT = 60;
