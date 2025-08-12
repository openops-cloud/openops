import { ActionType, CODE_BLOCK_NAME } from '@openops/shared';
import { StepDetails } from '../types';

const getBlockName = (stepDetails: StepDetails | undefined) => {
  if (stepDetails?.settings?.blockName) {
    return stepDetails?.settings?.blockName;
  }

  return stepDetails?.type === ActionType.CODE ? CODE_BLOCK_NAME : '';
};

const getActionName = (stepDetails: StepDetails | undefined) => {
  if (stepDetails?.settings?.actionName) {
    return stepDetails?.settings?.actionName;
  }

  return stepDetails?.type === ActionType.CODE ? ActionType.CODE : '';
};

export { getActionName, getBlockName };
