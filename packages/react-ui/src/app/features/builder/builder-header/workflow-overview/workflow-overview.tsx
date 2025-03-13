import { WorkflowOverviewContent } from '@/app/features/builder/builder-header/workflow-overview/workflow-overview-content';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import {
  Button,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  toast,
  TooltipWrapper,
  UNSAVED_CHANGES_TOAST,
} from '@openops/components/ui';
import { debounce, FlowOperationType } from '@openops/shared';
import { t } from 'i18next';
import { BookOpen } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const WorkflowOverview = () => {
  const [isWorkflowReadonly, savedOverview, applyOperation] =
    useBuilderStateContext((state) => [
      state.readonly,
      state.flowVersion.description,
      state.applyOperation,
    ]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [currentOverview, setCurrentOverview] = useState(savedOverview ?? '');

  const debouncedSaveDescription = useCallback(
    debounce((newDescription: string) => {
      if (savedOverview !== newDescription) {
        applyOperation(
          {
            type: FlowOperationType.CHANGE_DESCRIPTION,
            request: { description: newDescription },
          },
          () => toast(UNSAVED_CHANGES_TOAST),
        );
      }
    }, 500),
    [applyOperation, savedOverview],
  );

  useEffect(() => {
    debouncedSaveDescription(currentOverview);
  }, [currentOverview, debouncedSaveDescription]);

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverAnchor className="absolute left-6 top-[58px]"></PopoverAnchor>
      <PopoverTrigger asChild>
        <div className="bg-background shadow-editor flex items-center justify-center rounded-lg z-50 p-1 h-[42px]">
          <TooltipWrapper tooltipText={t('Notes')} tooltipPlacement="bottom">
            <Button
              variant={isPopoverOpen ? 'ghostActive' : 'ghost'}
              className="p-2 h-[34px] gap-[10px]"
              aria-label="Workflow notes"
            >
              <BookOpen size={20} />

              <span
                className={
                  'hidden text-sm font-normal leading-none @[1030px]:block'
                }
              >
                {t('Notes')}
              </span>
            </Button>
          </TooltipWrapper>
        </div>
      </PopoverTrigger>
      <PopoverContent
        updatePositionStrategy="always"
        side="bottom"
        align="start"
        onInteractOutside={(e) => e.preventDefault()}
        className="w-fit p-0"
      >
        <WorkflowOverviewContent
          overview={currentOverview}
          onOverviewChange={setCurrentOverview}
          isWorkflowReadonly={isWorkflowReadonly}
        />
      </PopoverContent>
    </Popover>
  );
};

WorkflowOverview.displayName = 'WorkflowOverview';
export { WorkflowOverview };
