import {
  BlockActionLimitMetadata,
  BlockStepMetadataWithSuggestions,
  toast,
  UNSAVED_CHANGES_TOAST,
} from '@openops/components/ui';
import {
  ActionType,
  FlowOperationType,
  TestRunLimitSettings,
} from '@openops/shared';
import { useCallback, useMemo } from 'react';
import { blocksHooks } from '../../blocks/lib/blocks-hook';
import { useBuilderStateContext } from '../builder-hooks';

export const useTestRunLimitsDialog = () => {
  const [testRunActionLimits, applyOperation, saving] = useBuilderStateContext(
    (state) => [
      state.flowVersion.testRunActionLimits,
      state.applyOperation,
      state.saving,
    ],
  );

  const { metadata } = blocksHooks.useAllStepsMetadata({
    type: 'action',
  });

  const blockActionMetaMap: BlockActionLimitMetadata = useMemo(() => {
    const map: BlockActionLimitMetadata = {};

    const limits = testRunActionLimits.limits;
    if (!limits?.length) return map;

    for (const limit of limits) {
      const blockName = limit.blockName;
      const actionName = limit.actionName;

      const blockMeta = metadata?.find(
        (metadata) =>
          metadata.type === ActionType.BLOCK &&
          'blockName' in metadata &&
          metadata.blockName === blockName,
      ) as BlockStepMetadataWithSuggestions | undefined;

      if (!map[blockName]) {
        map[blockName] = {
          displayName: blockMeta?.displayName ?? blockName,
          logoUrl: blockMeta?.logoUrl ?? '',
          actions: {},
        };
      }

      const actionMeta = (blockMeta?.suggestedActions || []).find(
        (a) => a?.name === actionName,
      );

      map[blockName].actions[actionName] =
        actionMeta?.displayName ?? actionName;
    }

    return map;
  }, [testRunActionLimits, metadata]);

  const onSave = useCallback(
    (testRunActionLimits: TestRunLimitSettings) => {
      applyOperation(
        {
          type: FlowOperationType.UPDATE_TEST_RUN_ACTION_LIMITS,
          request: { testRunActionLimits },
        },
        () => toast(UNSAVED_CHANGES_TOAST),
      );
    },
    [applyOperation],
  );

  return {
    testRunActionLimits,
    blockActionMetaMap,
    onSave,
    isLoading: saving,
  };
};
