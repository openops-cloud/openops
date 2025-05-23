import {
  AI_CHAT_CONTAINER_SIZES,
  cn,
  Input,
  LoadingSpinner,
  ScrollArea,
} from '@openops/components/ui';
import { t } from 'i18next';
import { SearchXIcon } from 'lucide-react';
import { useCallback, useState } from 'react';

import { FlagId, flowHelper, isNil } from '@openops/shared';

import { useBuilderStateContext } from '../builder-hooks';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { QueryKeys } from '@/app/constants/query-keys';
import { useQuery } from '@tanstack/react-query';
import { flowsApi } from '../../flows/lib/flows-api';
import { BuilderState } from '../builder-types';
import { DataSelectorNode } from './data-selector-node';
import {
  DataSelectorSizeState,
  DataSelectorSizeTogglers,
} from './data-selector-size-togglers';
import { dataSelectorUtils, MentionTreeNode } from './data-selector-utils';

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

  const pathToTargetStep = useBuilderStateContext(getPathToTargetStep);
  const mentionsFromCurrentSelectedData = useBuilderStateContext(
    getAllStepsMentionsFromCurrentSelectedData,
  );

  const stepIds: string[] = pathToTargetStep.map((p) => p.id!);

  const { data: stepsTestOutput, isLoading } = useQuery({
    queryKey: [QueryKeys.dataSelectorStepTestOutput, flowVersionId, ...stepIds],
    queryFn: async () => {
      const stepTestOuput = await flowsApi.getStepTestOutputBulk(
        flowVersionId,
        stepIds,
      );
      return stepTestOuput;
    },
    enabled:
      !!useNewExternalTestData && isDataSelectorVisible && stepIds.length > 0,
  });

  const mentions = useNewExternalTestData
    ? dataSelectorUtils.getAllStepsMentions(pathToTargetStep, stepsTestOutput)
    : mentionsFromCurrentSelectedData;

  const midpanelState = useBuilderStateContext((state) => state.midpanelState);
  const filteredMentions = filterBy(structuredClone(mentions), searchTerm);

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
