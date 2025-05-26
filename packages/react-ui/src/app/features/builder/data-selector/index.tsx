import {
  AI_CHAT_CONTAINER_SIZES,
  cn,
  Input,
  LoadingSpinner,
  ScrollArea,
} from '@openops/components/ui';
import { t } from 'i18next';
import { SearchXIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { FlagId, flowHelper, isNil, StepOutputWithData } from '@openops/shared';

import { useBuilderStateContext } from '../builder-hooks';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { BuilderState } from '../builder-types';
import { stepTestOutputCache } from './data-selector-cache';
import { DataSelectorNode } from './data-selector-node';
import {
  DataSelectorSizeState,
  DataSelectorSizeTogglers,
} from './data-selector-size-togglers';
import { dataSelectorUtils, MentionTreeNode } from './data-selector-utils';
import { useSelectorData } from './use-selector-data';

function filterBy(arr: MentionTreeNode[], query: string): MentionTreeNode[] {
  if (!query) {
    return arr;
  }

  return arr.reduce((acc, item) => {
    const isTestNode =
      !isNil(item.children) && item?.children?.[0]?.data?.isTestStepNode;
    if (isTestNode) {
      return acc;
    }

    if (item.children?.length) {
      const filteredChildren = filterBy(item.children, query);
      if (filteredChildren.length) {
        acc.push({ ...item, children: filteredChildren });
        return acc;
      }
    }

    const normalizedValue = item?.data?.value;
    const value = isNil(normalizedValue)
      ? ''
      : JSON.stringify(normalizedValue).toLowerCase();
    const displayName = item?.data?.displayName?.toLowerCase();

    if (
      displayName?.includes(query.toLowerCase()) ||
      value.includes(query.toLowerCase())
    ) {
      acc.push({ ...item, children: undefined });
    }

    return acc;
  }, [] as MentionTreeNode[]);
}

const getPathToTargetStep = (state: BuilderState) => {
  const { selectedStep, flowVersion } = state;
  if (!selectedStep || !flowVersion?.trigger) {
    return [];
  }
  const pathToTargetStep = flowHelper.findPathToStep({
    targetStepName: selectedStep,
    trigger: flowVersion.trigger,
  });
  return pathToTargetStep;
};

/**
 * @deprecated currentSelectedData will be removed in the future
 */
const getAllStepsMentionsFromCurrentSelectedData: (
  state: BuilderState,
) => MentionTreeNode[] = (state) => {
  const { selectedStep, flowVersion } = state;
  if (!selectedStep || !flowVersion?.trigger) {
    return [];
  }
  const pathToTargetStep = flowHelper.findPathToStep({
    targetStepName: selectedStep,
    trigger: flowVersion.trigger,
  });

  return pathToTargetStep.map((step) => {
    const stepNeedsTesting = isNil(step.settings.inputUiInfo?.lastTestDate);
    const displayName = `${step.dfsIndex + 1}. ${step.displayName}`;
    if (stepNeedsTesting) {
      return dataSelectorUtils.createTestNode(step, displayName);
    }
    return dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
      stepOutput: step.settings.inputUiInfo?.currentSelectedData,
      propertyPath: step.name,
      displayName: displayName,
    });
  });
};

type DataSelectorProps = {
  parentHeight: number;
  parentWidth: number;
  showDataSelector: boolean;
  dataSelectorSize: DataSelectorSizeState;
  setDataSelectorSize: (dataSelectorSize: DataSelectorSizeState) => void;
  className?: string;
};

const DataSelector = ({
  parentHeight,
  parentWidth,
  showDataSelector,
  dataSelectorSize,
  setDataSelectorSize,
  className,
}: DataSelectorProps) => {
  const { data: useNewExternalTestData = false } = flagsHooks.useFlag(
    FlagId.USE_NEW_EXTERNAL_TESTDATA,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const flowVersionId = useBuilderStateContext((state) => state.flowVersion.id);
  const isDataSelectorVisible = useBuilderStateContext(
    (state) => state.midpanelState.showDataSelector,
  );

  console.log('StepTestOutputCache', stepTestOutputCache);

  const pathToTargetStep = useBuilderStateContext(getPathToTargetStep);
  const mentionsFromCurrentSelectedData = useBuilderStateContext(
    getAllStepsMentionsFromCurrentSelectedData,
  );

  const stepIds: string[] = pathToTargetStep.map((p) => p.id!);
  // console.log('stepIds', stepIds);

  const [forceRender, forceRerender] = useState(0); // for cache updates
  const [initialLoad, setInitialLoad] = useState(true);

  const { isLoading } = useSelectorData({
    stepIds,
    flowVersionId,
    useNewExternalTestData: !!useNewExternalTestData,
    isDataSelectorVisible,
    initialLoad,
    setInitialLoad,
    forceRerender,
  });

  const mentions = useMemo(() => {
    if (!useNewExternalTestData) {
      return mentionsFromCurrentSelectedData;
    }
    const stepTestOutput: Record<string, StepOutputWithData> = {};
    stepIds.forEach((id) => {
      const cached = stepTestOutputCache.getStepData(id);
      if (cached) stepTestOutput[id] = cached;
    });
    return dataSelectorUtils.getAllStepsMentions(
      pathToTargetStep,
      stepTestOutput,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    useNewExternalTestData,
    mentionsFromCurrentSelectedData,
    pathToTargetStep,
    stepIds,
    forceRender,
    initialLoad,
  ]);

  const getExpanded = (nodeKey: string) =>
    stepTestOutputCache.getExpanded(nodeKey);
  const setExpanded = (nodeKey: string, expanded: boolean) => {
    stepTestOutputCache.setExpanded(nodeKey, expanded);
    forceRerender((v) => v + 1);
  };

  // Auto-expand/collapse nodes on search term change
  useEffect(() => {
    if (searchTerm) {
      // Expand all nodes at depth 0 and 1
      const expandNodes = (nodes: MentionTreeNode[], depth: number) => {
        nodes.forEach((node) => {
          if (depth <= 1) {
            stepTestOutputCache.setExpanded(node.key, true);
          }
          if (node.children) {
            expandNodes(node.children, depth + 1);
          }
        });
      };
      expandNodes(mentions, 0);
    } else {
      // Collapse all nodes
      const collapseNodes = (nodes: MentionTreeNode[]) => {
        nodes.forEach((node) => {
          stepTestOutputCache.setExpanded(node.key, false);
          if (node.children) {
            collapseNodes(node.children);
          }
        });
      };
      collapseNodes(mentions);
    }
    forceRerender((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const midpanelState = useBuilderStateContext((state) => state.midpanelState);
  const filteredMentions = useMemo(
    () => filterBy(structuredClone(mentions), searchTerm),
    [mentions, searchTerm],
  );

  const onToggle = useCallback(() => {
    if (
      [DataSelectorSizeState.DOCKED, DataSelectorSizeState.EXPANDED].includes(
        dataSelectorSize,
      )
    ) {
      return;
    }

    if (midpanelState.aiContainerSize === AI_CHAT_CONTAINER_SIZES.EXPANDED) {
      setDataSelectorSize(DataSelectorSizeState.EXPANDED);
    } else {
      setDataSelectorSize(DataSelectorSizeState.DOCKED);
    }
  }, [dataSelectorSize, midpanelState.aiContainerSize, setDataSelectorSize]);

  // Clear cache on unmount or when flowVersionId changes
  // todo - maybe move to top level, so we still have data when navigating between view-only / edit mode
  useEffect(() => {
    return () => {
      stepTestOutputCache.clearAll();
    };
  }, [flowVersionId]);

  return (
    <div
      tabIndex={0}
      className={cn(
        'mr-5 mb-5 z-50 transition-all border border-solid border-outline overflow-x-hidden bg-background shadow-lg rounded-md',
        {
          hidden: !showDataSelector,
        },
        className,
      )}
    >
      <div
        className="text-lg items-center font-semibold px-5 py-2 flex gap-2"
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onToggle();
          }
        }}
        aria-label={t('Toggle Data Selector')}
      >
        {t('Data Selector')} <div className="flex-grow"></div>
        <DataSelectorSizeTogglers
          state={dataSelectorSize}
          setListSizeState={setDataSelectorSize}
        ></DataSelectorSizeTogglers>
      </div>
      <div
        style={{
          height:
            dataSelectorSize === DataSelectorSizeState.COLLAPSED
              ? '0px'
              : dataSelectorSize === DataSelectorSizeState.DOCKED
              ? '450px'
              : `${parentHeight - 180}px`,
          width:
            dataSelectorSize !== DataSelectorSizeState.EXPANDED
              ? '450px'
              : `${parentWidth - 40}px`,
        }}
        className="transition-all overflow-hidden"
      >
        <div className="flex items-center gap-2 px-5 py-2">
          <Input
            placeholder={t('Search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          ></Input>
        </div>

        {isLoading && (
          <div className="w-full h-full flex items-center justify-center">
            <LoadingSpinner></LoadingSpinner>
          </div>
        )}

        <ScrollArea className="transition-all h-[calc(100%-56px)] w-full ">
          {filteredMentions &&
            filteredMentions.map((node) => (
              <DataSelectorNode
                depth={0}
                key={node.key}
                node={node}
                searchTerm={searchTerm}
                getExpanded={getExpanded}
                setExpanded={setExpanded}
              ></DataSelectorNode>
            ))}
          {filteredMentions.length === 0 && (
            <div className="flex items-center justify-center gap-2 mt-5  flex-col">
              <SearchXIcon className="w-[35px] h-[35px]"></SearchXIcon>
              <div className="text-center font-semibold text-md">
                {t('No matching data')}
              </div>
              <div className="text-center ">
                {t('Try adjusting your search')}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

DataSelector.displayName = 'DataSelector';
export { DataSelector };
