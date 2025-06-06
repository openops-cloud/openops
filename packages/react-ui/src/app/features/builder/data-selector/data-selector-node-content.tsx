import { BlockIcon, Button, TooltipWrapper } from '@openops/components/ui';
import { t } from 'i18next';
import { ChevronDown, ChevronUp, CircleAlert } from 'lucide-react';

import { flowHelper } from '@openops/shared';

import { useRipple } from '../../../common/providers/theme-provider';
import { blocksHooks } from '../../blocks/lib/blocks-hook';
import { useBuilderStateContext } from '../builder-hooks';

import { dataSelectorUtils, MentionTreeNode } from './data-selector-utils';

const ToggleIcon = ({ expanded }: { expanded: boolean }) => {
  const toggleIconSize = 15;
  return expanded ? (
    <ChevronUp height={toggleIconSize} width={toggleIconSize}></ChevronUp>
  ) : (
    <ChevronDown height={toggleIconSize} width={toggleIconSize}></ChevronDown>
  );
};

type DataSelectorNodeContentProps = {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  depth: number;
  node: MentionTreeNode;
};
const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (event.target) {
      (event.target as HTMLDivElement).click();
    }
  }
};

const DataSelectorNodeContent = ({
  node,
  expanded,
  setExpanded,
  depth,
}: DataSelectorNodeContentProps) => {
  const flowVersion = useBuilderStateContext((state) => state.flowVersion);
  const insertMention = useBuilderStateContext((state) => state.insertMention);

  const [ripple, rippleEvent] = useRipple();
  const step = !node.data.isSlice
    ? flowHelper.getStep(flowVersion, node.data.propertyPath)
    : undefined;
  const stepMetadata = step
    ? blocksHooks.useStepMetadata({ step }).stepMetadata
    : undefined;

  const showInsertButton =
    !node.data.isSlice &&
    !(
      node.children &&
      node.children.length > 0 &&
      node.children[0].data.isTestStepNode
    );
  const showNodeValue = !node.children && !!node.data.value;

  const stepHasSampleData = dataSelectorUtils.hasStepSampleData(step);

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyPress}
      ref={ripple}
      onClick={(e) => {
        rippleEvent(e);
        if (node.children && node.children.length > 0) {
          setExpanded(!expanded);
        } else if (insertMention) {
          insertMention(node.data.propertyPath);
        }
      }}
      className="w-full max-w-full select-none focus:outline-none hover:bg-accent focus:bg-accent focus:bg-opacity-75 hover:bg-opacity-75 cursor-pointer group"
    >
      <div className="flex-grow max-w-full flex items-center gap-2 min-h-[48px] pr-3 select-none">
        <div
          style={{
            minWidth: `${depth * 25 + (depth === 0 ? 0 : 25) + 18}px`,
          }}
        ></div>
        {stepMetadata && (
          <div className="flex-shrink-0">
            <BlockIcon
              displayName={stepMetadata.displayName}
              logoUrl={stepMetadata.logoUrl}
              showTooltip={false}
              circle={false}
              border={false}
              size="sm"
            ></BlockIcon>
          </div>
        )}
        <div className="truncate">{node.data.displayName}</div>
        {stepHasSampleData && (
          <TooltipWrapper
            tooltipText={t('Step contains sample data')}
            tooltipPlacement="bottom"
          >
            <CircleAlert
              className="min-w-4 w-4 h-4 text-warning-200"
              role="img"
              aria-label={t('Step contains sample data')}
            />
          </TooltipWrapper>
        )}
        {showNodeValue && (
          <>
            <div className="flex-shrink-0">:</div>
            <div className="flex-1 text-primary truncate">
              {`${node.data.value}`}
            </div>
          </>
        )}

        <div className="ml-auto flex flex-shrink-0 gap-2 items-center">
          {showInsertButton && (
            <Button
              className="z-50 hover:opacity-100 opacity-0 p-0 w-0 group-hover:w-full group-hover:p-1 group-hover:opacity-100 focus:opacity-100"
              variant="basic"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (insertMention) {
                  insertMention(node.data.propertyPath);
                }
              }}
            >
              {t('Insert')}
            </Button>
          )}
          {node.children && node.children.length > 0 && (
            <div className="flex-shrink-0 pr-5">
              <ToggleIcon expanded={expanded}></ToggleIcon>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
DataSelectorNodeContent.displayName = 'DataSelectorNodeContent';
export { DataSelectorNodeContent };
