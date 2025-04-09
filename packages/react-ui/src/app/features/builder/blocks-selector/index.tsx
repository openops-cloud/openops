import {
  BlockIcon,
  BlockSelectorOperation,
  BlockStepMetadata,
  Button,
  CardList,
  CardListItem,
  CardListItemSkeleton,
  Input,
  INTERNAL_ERROR_TOAST,
  ItemListMetadata,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Separator,
  StepMetadata,
  toast,
  UNSAVED_CHANGES_TOAST,
} from '@openops/components/ui';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { MoveLeft, SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDebounce } from 'use-debounce';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { BlockOperationSuggestions } from '@/app/features/blocks/components/block-operations-suggestions';
import { blocksApi } from '@/app/features/blocks/lib/blocks-api';
import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import { blockSelectorUtils } from '@/app/features/builder/blocks-selector/block-selector-utils';
import {
  ALL_KEY,
  BlockTagGroup,
  TagKey,
} from '@/app/features/builder/blocks-selector/block-tag-group';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { useApplyOperationAndPushToHistory } from '@/app/features/builder/flow-version-undo-redo/hooks/apply-operation-and-push-to-history';
import {
  Action,
  ActionType,
  BlockCategory,
  FlagId,
  FlowOperationType,
  isNil,
  supportUrl,
  Trigger,
  TriggerType,
} from '@openops/shared';

type BlockSelectorProps = {
  children: React.ReactNode;
  open: boolean;
  asChild?: boolean;
  onOpenChange: (open: boolean) => void;
  operation: BlockSelectorOperation;
};

const BlockSelector = ({
  children,
  open,
  asChild = true,
  onOpenChange,
  operation,
}: BlockSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  const showRequestBlockButton = flagsHooks.useFlag<boolean>(
    FlagId.SHOW_COMMUNITY,
  ).data;
  const [selectedBlockMetadata, setSelectedMetadata] = useState<
    StepMetadata | undefined
  >(undefined);
  const [actionsOrTriggers, setSelectedSubItems] = useState<
    ItemListMetadata[] | undefined
  >(undefined);

  const [selectedTag, setSelectedTag] = useState<TagKey>(ALL_KEY);
  const [selectStepByName, flowVersion] = useBuilderStateContext((state) => [
    state.selectStepByName,
    state.flowVersion,
  ]);
  const applyOperationAndPushToHistory = useApplyOperationAndPushToHistory();
  const { metadata, isLoading: isLoadingBlocks } =
    blocksHooks.useAllStepsMetadata({
      searchQuery: debouncedQuery,
      type:
        operation.type === FlowOperationType.UPDATE_TRIGGER
          ? 'trigger'
          : 'action',
    });

  const resetField = () => {
    setSearchQuery('');
    setSelectedSubItems(undefined);
    setSelectedMetadata(undefined);
    setSelectedTag(ALL_KEY);
  };

  const handleSelect = async (
    block: StepMetadata | undefined,
    item: ItemListMetadata,
  ) => {
    if (!block) {
      return;
    }
    resetField();
    onOpenChange(false);
    const newStepName = blockSelectorUtils.getStepName(block, flowVersion);
    const stepData = blockSelectorUtils.getDefaultStep({
      stepName: newStepName,
      block,
      actionOrTriggerName: item.name,
      displayName: item.displayName,
    });

    switch (operation.type) {
      case FlowOperationType.UPDATE_TRIGGER: {
        await applyOperationAndPushToHistory(
          {
            type: FlowOperationType.UPDATE_TRIGGER,
            request: stepData as Trigger,
          },
          () => toast(UNSAVED_CHANGES_TOAST),
        );
        selectStepByName('trigger');
        break;
      }
      case FlowOperationType.ADD_ACTION: {
        applyOperationAndPushToHistory(
          {
            type: FlowOperationType.ADD_ACTION,
            request: {
              parentStep: operation.actionLocation.parentStep,
              stepLocationRelativeToParent:
                operation.actionLocation.stepLocationRelativeToParent,
              branchNodeId: operation.actionLocation.branchNodeId,
              action: stepData as Action,
            },
          },
          () => toast(UNSAVED_CHANGES_TOAST),
        );
        selectStepByName(stepData.name);
        break;
      }
      case FlowOperationType.UPDATE_ACTION: {
        applyOperationAndPushToHistory(
          {
            type: FlowOperationType.UPDATE_ACTION,
            request: {
              type: (stepData as Action).type,
              displayName: stepData.displayName,
              name: operation.stepName,
              settings: {
                ...stepData.settings,
              },
              valid: stepData.valid,
            },
          },
          () => toast(UNSAVED_CHANGES_TOAST),
        );
      }
    }
  };

  const { mutate, isPending: isLoadingSelectedBlockMetadata } = useMutation({
    mutationFn: async (stepMetadata: StepMetadata) => {
      switch (stepMetadata.type) {
        case TriggerType.BLOCK: {
          const blockMetadata = await blocksApi.get({
            name: (stepMetadata as BlockStepMetadata).blockName,
          });
          return Object.entries(blockMetadata.triggers).map(
            ([triggerName, trigger]) => ({
              name: triggerName,
              displayName: trigger.displayName,
              description: trigger.description,
            }),
          );
        }
        case ActionType.BLOCK: {
          const blockMetadata = await blocksApi.get({
            name: (stepMetadata as BlockStepMetadata).blockName,
          });
          return Object.entries(blockMetadata.actions).map(
            ([actionName, action]) => ({
              name: actionName,
              displayName: action.displayName,
              description: action.description,
            }),
          );
        }
        case ActionType.CODE:
          return [
            {
              name: 'code',
              displayName: t('Custom TypeScript Code'),
              description: stepMetadata.description,
            },
          ];
        case ActionType.LOOP_ON_ITEMS:
          return [
            {
              name: 'loop',
              displayName: t('Loop on Items'),
              description: stepMetadata.description,
            },
          ];
        case ActionType.BRANCH:
          return [
            {
              name: 'branch',
              displayName: t('Condition'),
              description: t(
                'Split your workflow into two branches depending on condition(s)',
              ),
            },
          ];
        case ActionType.SPLIT:
          return [
            {
              name: 'split',
              displayName: t('Split'),
              description: t(
                'Split your workflow into multiple branches depending on condition(s)',
              ),
            },
          ];
        case TriggerType.EMPTY:
          throw new Error('Unsupported type: ' + stepMetadata.type);
      }
    },
    onSuccess: (items) => {
      setSelectedSubItems(items);
    },
    onError: (e) => {
      console.error(e);
      toast(INTERNAL_ERROR_TOAST);
    },
  });

  const blocksMetadata = useMemo(
    () =>
      metadata?.filter((stepMetadata) => {
        if (selectedTag === ALL_KEY) return true;

        if (selectedTag === BlockCategory.WORKFLOW) {
          return [
            ActionType.LOOP_ON_ITEMS,
            ActionType.SPLIT,
            ActionType.BRANCH,
          ].includes(stepMetadata.type as ActionType);
        }

        return (stepMetadata as BlockStepMetadata).categories?.includes(
          selectedTag,
        );
      }),
    [metadata, selectedTag],
  );

  const isSearching = !!debouncedQuery;

  return (
    <Popover
      open={open}
      modal={true}
      onOpenChange={(open) => {
        if (!open) {
          resetField();
        }
        onOpenChange(open);
      }}
    >
      <PopoverTrigger asChild={asChild}>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[600px] p-0 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2">
          <Input
            className="border-none"
            placeholder={t('Search')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedTag(ALL_KEY);
              setSelectedSubItems(undefined);
              setSelectedMetadata(undefined);
            }}
          />
        </div>
        {operation.type !== FlowOperationType.UPDATE_TRIGGER && (
          <BlockTagGroup
            selectedTag={selectedTag}
            onSelectTag={(value) => {
              setSelectedTag(value);
              setSelectedSubItems(undefined);
              setSelectedMetadata(undefined);
            }}
          />
        )}

        <Separator orientation="horizontal" />
        <div className="flex overflow-y-auto max-h-[300px] h-[300px]">
          <CardList className="w-[250px] min-w-[250px]">
            <ScrollArea>
              {isLoadingBlocks && (
                <CardListItemSkeleton numberOfCards={5} withCircle={false} />
              )}
              {!isLoadingBlocks &&
                blocksMetadata &&
                blocksMetadata.map((blockMetadata) => (
                  <CardListItem
                    className="flex-col p-3 gap-1 items-start"
                    key={blockSelectorUtils.toKey(blockMetadata)}
                    selected={
                      blockMetadata.displayName ===
                      selectedBlockMetadata?.displayName
                    }
                    onClick={(e) => {
                      if (
                        blockMetadata.displayName !==
                        selectedBlockMetadata?.displayName
                      ) {
                        setSelectedMetadata(blockMetadata);
                        mutate(blockMetadata);
                        e.stopPropagation();
                        e.preventDefault();
                      }
                    }}
                  >
                    <div className="flex gap-2 items-center">
                      <BlockIcon
                        logoUrl={blockMetadata.logoUrl}
                        displayName={blockMetadata.displayName}
                        showTooltip={false}
                        size={'sm'}
                      ></BlockIcon>
                      <div className="flex-grow h-full flex items-center justify-left text-sm">
                        {blockMetadata.displayName}
                      </div>
                    </div>
                    {isSearching && (
                      <BlockOperationSuggestions
                        blockMetadata={blockMetadata}
                        operation={operation}
                        handleSelectOperationSuggestion={handleSelect}
                      />
                    )}
                  </CardListItem>
                ))}

              {!isLoadingBlocks &&
                (!blocksMetadata || blocksMetadata.length === 0) && (
                  <div className="flex flex-col gap-2 items-center justify-center h-[300px] ">
                    <SearchX className="w-10 h-10" />
                    <div className="text-sm ">{t('No blocks found')}</div>
                    <div className="text-sm ">
                      {t('Try adjusting your search')}
                    </div>
                    {showRequestBlockButton && (
                      <Link
                        to={`${supportUrl}/c/feature-requests/9`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button className="h-8 px-2 ">Request Block</Button>
                      </Link>
                    )}
                  </div>
                )}
            </ScrollArea>
          </CardList>
          <Separator orientation="vertical" className="h-full" />
          <ScrollArea className="h-full">
            <CardList
              data-testid="blocksList"
              className="w-[350px] min-w-[350px] h-full"
            >
              {!isLoadingBlocks && (
                <>
                  {isLoadingSelectedBlockMetadata && (
                    <CardListItemSkeleton
                      numberOfCards={5}
                      withCircle={false}
                    />
                  )}
                  {!isLoadingSelectedBlockMetadata &&
                    selectedBlockMetadata &&
                    actionsOrTriggers &&
                    actionsOrTriggers.map((item) => (
                      <CardListItem
                        className="p-2 w-full"
                        key={item.name}
                        onClick={() =>
                          handleSelect(selectedBlockMetadata, item)
                        }
                      >
                        <div className="flex gap-3 items-center">
                          <div>
                            <BlockIcon
                              logoUrl={selectedBlockMetadata.logoUrl}
                              displayName={selectedBlockMetadata.displayName}
                              showTooltip={false}
                              size={'sm'}
                            ></BlockIcon>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <div className="text-sm">{item.displayName}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.description}
                            </div>
                          </div>
                        </div>
                      </CardListItem>
                    ))}
                </>
              )}
              {(isNil(actionsOrTriggers) || isLoadingBlocks) && (
                <div className="flex flex-col gap-2 items-center justify-center h-[300px]">
                  <MoveLeft className="w-10 h-10 rtl:rotate-180" />
                  <div className="text-sm">{t('Please select')}</div>
                </div>
              )}
            </CardList>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export { BlockSelector };
