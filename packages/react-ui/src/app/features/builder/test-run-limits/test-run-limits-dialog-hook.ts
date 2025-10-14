import {
  BlockActionLimitMetadata,
  BlockStepMetadataWithSuggestions,
} from '@openops/components/ui';
import { ActionType } from '@openops/shared';
import { useMemo } from 'react';
import { blocksHooks } from '../../blocks/lib/blocks-hook';
import { useBuilderStateContext } from '../builder-hooks';

const DIALOG_TEST_SETTINGS = {
  isEnabled: true,
  limits: [
    {
      limit: 10,
      blockName: '@openops/block-archera',
      isEnabled: true,
      actionName: 'archera_apply_commitment_plan',
    },
    {
      limit: 10,
      blockName: '@openops/block-microsoft-outlook',
      isEnabled: true,
      actionName: 'send-email',
    },
    {
      limit: 10,
      blockName: '@openops/block-vantage',
      isEnabled: true,
      actionName: 'custom_api_call',
    },
    {
      limit: 10,
      blockName: '@openops/block-github',
      isEnabled: true,
      actionName: 'create_pull_request_action',
    },
  ],
};

export const useTestRunLimitsDialog = () => {
  const [testRunLimitSettings, applyOperation, saving] = useBuilderStateContext(
    (state) => [
      state.flowVersion.testRunLimitSettings,
      state.applyOperation,
      state.saving,
    ],
  );

  const { metadata } = blocksHooks.useAllStepsMetadata({
    type: 'action',
  });

  const blockActionMetaMap: BlockActionLimitMetadata = useMemo(() => {
    const map: BlockActionLimitMetadata = {};

    const limits = testRunLimitSettings?.limits ?? DIALOG_TEST_SETTINGS.limits;
    if (!limits.length) return map;

    limits.forEach((limit) => {
      const blockName = limit.blockName;
      const actionName = limit.actionName;

      const blockMeta = metadata?.find(
        (metadata) =>
          metadata.type === ActionType.BLOCK &&
          'blockName' in metadata &&
          metadata.blockName === blockName,
      ) as BlockStepMetadataWithSuggestions;

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
    });

    return map;
  }, [testRunLimitSettings, metadata]);

  return {
    testRunLimitSettings: testRunLimitSettings ?? DIALOG_TEST_SETTINGS,
    blockActionMetaMap,
    isLoading: saving,
  };
};
