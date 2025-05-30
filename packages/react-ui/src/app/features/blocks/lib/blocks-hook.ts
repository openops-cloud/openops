import { useQueries, useQuery } from '@tanstack/react-query';

import { QueryKeys } from '@/app/constants/query-keys';
import {
  ActionBase,
  BlockMetadataModel,
  BlockMetadataModelSummary,
  TriggerBase,
} from '@openops/blocks-framework';
import {
  Action,
  ActionType,
  BlockCategory,
  isNil,
  SuggestionType,
  Trigger,
  TriggerType,
} from '@openops/shared';

import {
  BlockStepMetadata,
  PRIMITIVE_STEP_METADATA,
  PrimitiveStepMetadata,
  StepMetadata,
  StepMetadataWithSuggestions,
} from '@openops/components/ui';
import { blocksApi } from './blocks-api';

type UseBlockProps = {
  name: string;
  version?: string;
  enabled?: boolean;
};
type Step = Action | Trigger;

type UseStepsMetadata = Step[];

type UseMultipleBlocksProps = {
  names: string[];
};

type UseBlockMetadata = {
  step: Action | Trigger | undefined;
  enabled?: boolean;
};

type UseBlocksProps = {
  searchQuery?: string;
};

type UseMetadataProps = {
  searchQuery?: string;
  enabled?: boolean;
  type: 'action' | 'trigger';
};

export const blocksHooks = {
  useBlock: ({ name, version, enabled = true }: UseBlockProps) => {
    const query = useQuery<BlockMetadataModel, Error>({
      queryKey: [QueryKeys.block, name, version],
      queryFn: () => blocksApi.get({ name, version }),
      staleTime: Infinity,
      enabled,
    });
    return {
      blockModel: query.data,
      isLoading: query.isLoading,
      isSuccess: query.isSuccess,
      refetch: query.refetch,
    };
  },
  useMultipleBlocks: ({ names }: UseMultipleBlocksProps) => {
    return useQueries({
      queries: names.map((name) => ({
        queryKey: [QueryKeys.block, name, undefined],
        queryFn: () => blocksApi.get({ name, version: undefined }),
        staleTime: Infinity,
      })),
    });
  },
  useStepMetadata: ({ step, enabled = true }: UseBlockMetadata) => {
    const blockName = step?.settings?.blockName;
    const blockVersion = step?.settings?.blockVersion;
    const query = useQuery<StepMetadata, Error>({
      queryKey: [QueryKeys.block, step?.type, blockName, blockVersion],
      queryFn: () => blocksApi.getMetadata(step!),
      staleTime: Infinity,
      enabled: enabled && !isNil(step),
    });
    return {
      stepMetadata: query.data,
      isLoading: query.isLoading,
    };
  },
  useStepTemplateMetadata: ({
    stepMetadata,
    stepTemplateModel,
  }: {
    stepMetadata?: StepMetadata;
    stepTemplateModel?: ActionBase | TriggerBase;
  }) => {
    const { displayName, description } = stepTemplateModel ||
      stepMetadata || {
        displayName: '',
        description: '',
      };
    return {
      displayName,
      description,
    };
  },
  useStepsMetadata: (props: UseStepsMetadata) => {
    return useQueries({
      queries: props.map((step) => stepMetadataQueryBuilder(step)),
    });
  },
  useStepLogos: (
    props: UseStepsMetadata,
  ): { displayName: string; logoUrl: string }[] => {
    return useQueries({
      queries: props.map((step) => stepMetadataQueryBuilder(step)),
    })
      .map((data) => data.data)
      .filter((data) => !!data)
      .map((stepMetadata) => {
        return {
          displayName: stepMetadata.displayName,
          logoUrl: stepMetadata.logoUrl,
        };
      });
  },
  useIntegrationStepLogos: (
    props: UseStepsMetadata,
  ): { displayName: string; logoUrl: string }[] => {
    const notCommonSteps = props.filter(
      (step) =>
        step.type === ActionType.BLOCK || step.type === TriggerType.BLOCK,
    );
    return useQueries({
      queries: notCommonSteps.map((step) => stepMetadataQueryBuilder(step)),
    })
      .map((data) => data.data)
      .filter(
        (data): data is BlockStepMetadata =>
          !!data &&
          'categories' in data &&
          !data.categories.includes(BlockCategory.CORE),
      )
      .map((stepMetadata) => {
        return {
          displayName: stepMetadata.displayName,
          logoUrl: stepMetadata.logoUrl,
        };
      });
  },
  useBlocks: ({ searchQuery }: UseBlocksProps) => {
    const query = useQuery<BlockMetadataModelSummary[], Error>({
      queryKey: [QueryKeys.blocks, searchQuery],
      queryFn: () => blocksApi.list({ searchQuery }),
      staleTime: searchQuery ? 0 : Infinity,
    });
    return {
      blocks: query.data,
      isLoading: query.isLoading,
    };
  },
  useAllStepsMetadata: ({ searchQuery, type, enabled }: UseMetadataProps) => {
    const query = useQuery<StepMetadataWithSuggestions[], Error>({
      queryKey: [QueryKeys.blocksMetadata, searchQuery, type],
      queryFn: async () => {
        const blocks = await blocksApi.list({
          searchQuery,
          suggestionType:
            type === 'action' ? SuggestionType.ACTION : SuggestionType.TRIGGER,
        });
        const blocksMetadata = blocks
          .filter(
            (block) =>
              (type === 'action' && block.actions > 0) ||
              (type === 'trigger' && block.triggers > 0),
          )
          .map((block) => {
            const metadata = blocksApi.mapToMetadata(type, block);
            const suggestions = blocksApi.mapToSuggestions(block);

            return {
              ...metadata,
              ...suggestions,
            };
          });
        switch (type) {
          case 'action': {
            const filtersPrimitive = [
              PRIMITIVE_STEP_METADATA[ActionType.CODE],
              PRIMITIVE_STEP_METADATA[ActionType.LOOP_ON_ITEMS],
              PRIMITIVE_STEP_METADATA[ActionType.BRANCH],
              PRIMITIVE_STEP_METADATA[ActionType.SPLIT],
            ].filter((step) => passSearch(searchQuery, step));
            return [...filtersPrimitive, ...blocksMetadata];
          }
          case 'trigger':
            return [...blocksMetadata];
        }
      },
      enabled,
      staleTime: searchQuery ? 0 : Infinity,
    });
    return {
      refetch: query.refetch,
      metadata: query.data,
      isLoading: query.isLoading,
    };
  },
};
function stepMetadataQueryBuilder(step: Step) {
  const isBlockStep =
    step.type === ActionType.BLOCK || step.type === TriggerType.BLOCK;
  const blockName = isBlockStep ? step.settings.blockName : undefined;
  const blockVersion = isBlockStep ? step.settings.blockVersion : undefined;
  return {
    queryKey: [QueryKeys.block, step.type, blockName, blockVersion],
    queryFn: () => blocksApi.getMetadata(step),
    staleTime: Infinity,
  };
}

function passSearch(
  searchQuery: string | undefined,
  data: PrimitiveStepMetadata,
) {
  if (!searchQuery) {
    return true;
  }
  return JSON.stringify({ data })
    .toLowerCase()
    .includes(searchQuery?.toLowerCase());
}
