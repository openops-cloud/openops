import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../ui/collapsible';
import { FlowTemplateFilterItem } from './flow-template-filter-item';
import { replaceServicePrefix } from './template-utils';
import { TemplateSidebarCategory } from './types';

type FlowTemplateCategoryCollapsibleProps = {
  category: TemplateSidebarCategory;
  selectedCategories: string[];
  selectedServices: string[];
  onCategoryFilterClick: (category: string) => void;
  onServiceFilterClick: (service: string) => void;
};

const FlowTemplateCategoryCollapsible = ({
  category,
  selectedCategories,
  selectedServices,
  onCategoryFilterClick,
  onServiceFilterClick,
}: FlowTemplateCategoryCollapsibleProps) => {
  const isCategorySelected = selectedCategories.includes(category.name);
  const ChevronIcon = isCategorySelected ? ChevronDown : ChevronRight;

  return (
    <Collapsible
      onOpenChange={(open) => {
        onCategoryFilterClick(open ? category.name : '');
      }}
    >
      <CollapsibleTrigger
        className={cn(
          'flex items-center cursor-pointer px-3 py-2 hover:bg-muted rounded w-full',
          {
            'bg-muted': isCategorySelected,
          },
        )}
      >
        <ChevronIcon
          className="size-4 flex-shrink-0 mr-2 dark:text-primary"
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
  );
};

FlowTemplateCategoryCollapsible.displayName = 'FlowTemplateCategoryCollapsible';
export { FlowTemplateCategoryCollapsible };
