import { Action, ActionType } from '@openops/shared';

export const hasInnerChildren = (step: Action): boolean => {
  switch (step.type) {
    case ActionType.LOOP_ON_ITEMS:
      return 'firstLoopAction' in step && !!step.firstLoopAction;

    case ActionType.BRANCH:
      return (
        ('onSuccessAction' in step && !!step.onSuccessAction) ||
        ('onFailureAction' in step && !!step.onFailureAction)
      );

    case ActionType.SPLIT:
      return (
        'branches' in step &&
        Array.isArray(step.branches) &&
        step.branches.some((branch) => !!branch?.nextAction)
      );

    default:
      return false;
  }
};
