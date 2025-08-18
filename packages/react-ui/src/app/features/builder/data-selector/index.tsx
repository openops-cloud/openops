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

import { flowHelper, StepOutputWithData } from '@openops/shared';

import { useBuilderStateContext } from '../builder-hooks';

import { stepTestOutputCache } from './data-selector-cache';
import { DataSelectorNode } from './data-selector-node';
import {
  DataSelectorSizeState,
  DataSelectorSizeTogglers,
} from './data-selector-size-togglers';
import { dataSelectorUtils } from './data-selector-utils';
import { expandOrCollapseNodesOnSearch } from './expand-or-collapse-on-search';
import { useSelectorData } from './use-selector-data';

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
  const [searchTerm, setSearchTerm] = useState('');
  const { flowVersionId, isDataSelectorVisible, midpanelState } =
    useBuilderStateContext((state) => ({
      flowVersionId: state.flowVersion.id,
      isDataSelectorVisible: state.midpanelState.showDataSelector,
      midpanelState: state.midpanelState,
    }));

  const { selectedStep, flowVersion } = useBuilderStateContext((state) => {
    return {
      selectedStep: state.selectedStep,
      flowVersion: state.flowVersion,
    };
  });

  const pathToTargetStep = useMemo(() => {
    if (!selectedStep || !flowVersion?.trigger) {
      return [];
    }
    const pathToTargetStep = flowHelper.findPathToStep({
      targetStepName: selectedStep,
      trigger: flowVersion.trigger,
    });
    return pathToTargetStep;
  }, [selectedStep, flowVersion]);

  const stepIds = useMemo(() => {
    return pathToTargetStep.map((p) => p.id);
  }, [pathToTargetStep]);

  const [forceRender, setForceRerender] = useState(0); // for cache updates
  const [initialLoad, setInitialLoad] = useState(true);

  const { isLoading } = useSelectorData({
    stepIds,
    flowVersionId,
    isDataSelectorVisible,
    initialLoad,
    setInitialLoad,
    forceRerender: setForceRerender,
  });

  const mentions = useMemo(() => {
    const stepTestOutput: Record<string, StepOutputWithData> = {};
    stepIds.forEach((id) => {
      const cached = stepTestOutputCache.getStepData(id);
      const step = pathToTargetStep.find((s) => s.id === id);
      const sampleData = step?.settings.inputUiInfo?.sampleData;
      const hasStepSampleData = dataSelectorUtils.hasStepSampleData(step);

      if (cached) {
        stepTestOutput[id] = {
          ...cached,
          output: hasStepSampleData ? sampleData : cached.output,
          success: hasStepSampleData ? true : cached.success,
          input: null,
        };
      }
    });
    return dataSelectorUtils.getAllStepsMentions(
      pathToTargetStep,
      stepTestOutput,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathToTargetStep, stepIds, forceRender, initialLoad]);

  const getExpanded = useCallback(
    (nodeKey: string) => stepTestOutputCache.getExpanded(nodeKey),
    [],
  );
  const setExpanded = (nodeKey: string, expanded: boolean) => {
    stepTestOutputCache.setExpanded(nodeKey, expanded);
    setForceRerender((v) => v + 1);
  };

  useEffect(() => {
    expandOrCollapseNodesOnSearch(mentions, searchTerm, setForceRerender);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const filteredMentions = useMemo(
    () => dataSelectorUtils.filterBy(structuredClone(mentions), searchTerm),
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
