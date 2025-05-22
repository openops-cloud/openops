import { WorkflowOverviewHeader } from '@/app/features/builder/builder-header/workflow-overview/workflow-overview-header';
import {
  BoxSize,
  Markdown,
  ResizableArea,
  Textarea,
} from '@openops/components/ui';
import { t } from 'i18next';
import { useState } from 'react';

type WorkflowOverviewContentProps = {
  overview?: string;
  isWorkflowReadonly: boolean;
  onOverviewChange: (overview: string) => void;
};

const INITIAL_SIZE = {
  width: 400,
  height: 450,
};

const WorkflowOverviewContent = ({
  overview = '',
  isWorkflowReadonly,
  onOverviewChange,
}: WorkflowOverviewContentProps) => {
  const [isDocumentationInEditMode, setIsDocumentationInEditMode] = useState(
    !overview && !isWorkflowReadonly,
  );

  const [dimensions, setDimensions] = useState<BoxSize>(INITIAL_SIZE);

  return (
    <div className="pt-6">
      <WorkflowOverviewHeader
        onEditClick={() => {
          setIsDocumentationInEditMode(true);
        }}
        isDocumentationInEditMode={isDocumentationInEditMode}
        isWorkflowReadonly={isWorkflowReadonly}
      ></WorkflowOverviewHeader>
      <ResizableArea
        dimensions={dimensions}
        setDimensions={setDimensions}
        minWidth={385}
        minHeight={300}
        maxWidth={700}
        maxHeight={700}
      >
        {isDocumentationInEditMode ? (
          <div className="flex flex-col h-full gap-2 px-[10px]">
            <Textarea
              className="resize-none flex-1 my-1 font-medium text-base"
              value={overview}
              placeholder={t('Add some notes...')}
              onChange={(e) => onOverviewChange(e.target.value)}
            ></Textarea>
          </div>
        ) : (
          <Markdown withBorder={false} markdown={overview} />
        )}
      </ResizableArea>
    </div>
  );
};
WorkflowOverviewContent.displayName = 'WorkflowOverviewViewMode';
export { WorkflowOverviewContent };
