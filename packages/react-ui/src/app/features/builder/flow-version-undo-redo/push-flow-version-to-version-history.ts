import { BuilderState } from '@/app/features/builder/builder-types';

export const pushFlowVersionToVersionHistory = (
  currentState: Pick<
    BuilderState,
    'flowVersion' | 'undoFlowVersionHistory' | 'redoFlowVersionHistory'
  >,
  spotlightStepName?: string,
) => {
  const { flowVersion, undoFlowVersionHistory, redoFlowVersionHistory } =
    currentState;
  if (!spotlightStepName) {
    return;
  }

  redoFlowVersionHistory.clear();

  undoFlowVersionHistory.push({
    snapshot: flowVersion.trigger,
    spotlightStepName,
    id: flowVersion.id,
  });
};
