import { t } from 'i18next';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../ui/collapsible';
import { ScrollArea } from '../../ui/scroll-area';
import { TooltipProvider } from '../../ui/tooltip';
import { OverflowTooltip } from '../overflow-tooltip';
import { replaceServicePrefix } from './template-utils';
import { TemplateSidebarCategory } from './types';

type FlowTemplateFilterItemProps = {
  value: string;
  displayName: string;
  onClick: (id: string) => void;
  isActive: boolean;
};

const FlowTemplateFilterItem = ({
  value,
  displayName,
  isActive,
  onClick,
}: FlowTemplateFilterItemProps) => (
  <div
    aria-selected={isActive}
    role="option"
    className={cn(
      'w-full px-3 py-3 justify-start items-start gap-2.5 inline-flex overflow-hidden cursor-pointer hover:bg-muted',
      {
        'bg-muted': isActive,
      },
    )}
    onClick={() => onClick(value)}
  >
    <TooltipProvider>
      <OverflowTooltip
        text={displayName}
        className="w-full font-normal text-slate-600 dark:text-primary text-base leading-snug truncate select-none"
      />
    </TooltipProvider>
  </div>
);

FlowTemplateFilterItem.displayName = 'FlowTemplateFilterItem';

const FlowTemplateFilterHeader = ({
  title,
  className,
}: {
  title: string;
  className?: string;
}) => (
  <div className="h-16 px-3 py-3 justify-start items-end gap-2.5 inline-flex overflow-hidden">
    <span
      className={cn(
        'text-slate-600 dark:text-primary text-base font-bold leading-snug truncate',
        className,
      )}
    >
      {title}
    </span>
  </div>
);

FlowTemplateFilterHeader.displayName = 'FlowTemplateFilterHeader';

type FlowTemplateFilterSidebarProps = {
  domains: string[];
  categories: TemplateSidebarCategory[];
  selectedDomains: string[];
  selectedServices: string[];
  selectedCategories: string[];
  onDomainFilterClick: (domain: string) => void;
  onServiceFilterClick: (service: string) => void;
  onCategoryFilterClick: (category: string) => void;
  clearFilters: () => void;
};

const FlowTemplateFilterSidebar = ({
  domains,
  categories,
  selectedDomains,
  selectedServices,
  selectedCategories,
  onDomainFilterClick,
  onServiceFilterClick,
  onCategoryFilterClick,
  clearFilters,
}: FlowTemplateFilterSidebarProps) => {
  return (
    <div className="rounded-2xl flex-col justify-start items-start inline-flex h-full w-full px-4 pt-[25px] pb-8 bg-background">
      <FlowTemplateFilterItem
        value={''}
        displayName={t('All Templates')}
        onClick={clearFilters}
        isActive={selectedDomains.length === 0 && selectedServices.length === 0}
      />
      <FlowTemplateFilterHeader title={t('FinOps capabilities')} />
      <ScrollArea className="max-h-[40%] w-full">
        <div className="flex flex-col w-full">
          {domains.map((domain) => (
            <FlowTemplateFilterItem
              key={domain}
              value={domain}
              displayName={domain}
              onClick={onDomainFilterClick}
              isActive={selectedDomains.includes(domain)}
            />
          ))}
        </div>
      </ScrollArea>
      <FlowTemplateFilterHeader title={t('Cloud providers')} />
      <ScrollArea className="max-h-[50%] w-full">
        <div className="flex flex-col w-full">
          {categories?.map((category) => (
            <Collapsible
              key={category.name}
              onOpenChange={(open) => {
                onCategoryFilterClick(open ? category.name : '');
              }}
            >
              <CollapsibleTrigger
                className={cn(
                  'flex items-center cursor-pointer px-3 py-2 hover:bg-muted rounded w-full group',
                  {
                    'bg-muted': selectedCategories.includes(category.name),
                  },
                )}
              >
                <ChevronRight
                  className="size-4 flex-shrink-0 mr-2 transition-transform group-data-[state=open]:rotate-90 dark:text-primary"
                  aria-hidden="true"
                />
                <span className="font-normal text-slate-600 dark:text-primary text-base">
                  {category.name}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="data-[state=open]:animate-slideDown overflow-hidden data-[state=closed]:animate-slideUp">
                <div className="pl-4">
                  {category.services.map((service) => (
                    <FlowTemplateFilterItem
                      key={service}
                      value={service}
                      displayName={replaceServicePrefix(service)}
                      onClick={onServiceFilterClick}
                      isActive={selectedServices.includes(service)}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

FlowTemplateFilterSidebar.displayName = 'FlowSidebar';

export { FlowTemplateFilterSidebar };
