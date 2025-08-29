import { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { ScrollArea } from '../../ui/scroll-area';
import { LoadingSpinner } from '../../ui/spinner';
import { FlowTemplateCard } from './flow-template-card';
import { NoTemplatesPlaceholder } from './no-templates-placeholder';
import { FlowTemplateMetadataWithIntegrations } from './types';

type FlowTemplateListProps = {
  templates: FlowTemplateMetadataWithIntegrations[] | undefined;
  isLoading: boolean;
  onTemplateSelect: (template: FlowTemplateMetadataWithIntegrations) => void;
  ownerLogoUrl?: string;
  children?: ReactNode;
};

const FlowTemplateList = ({
  templates,
  isLoading,
  onTemplateSelect,
  ownerLogoUrl,
  children,
}: FlowTemplateListProps) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center w-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (templates?.length === 0) return <NoTemplatesPlaceholder />;

  return (
    <ScrollArea type="auto" className="h-full">
      <div className={cn('flex flex-wrap gap-6 box-border pb-6')}>
        {templates?.map((template) => {
          return (
            <FlowTemplateCard
              key={template.id}
              templateMetadata={template}
              ownerLogoUrl={ownerLogoUrl}
              onClick={() => {
                onTemplateSelect(template);
              }}
            />
          );
        })}
        {children}
      </div>
    </ScrollArea>
  );
};

FlowTemplateList.displayName = 'FlowTemplateList';
export { FlowTemplateList };
