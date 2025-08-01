import { t } from 'i18next';
import { cn } from '../../lib/cn';
import { ScrollArea } from '../../ui/scroll-area';
import { FlowTemplateCategoryCollapsible } from './flow-template-category-collapsible';
import { FlowTemplateFilterItem } from './flow-template-filter-item';
import { TemplateSidebarCategory } from './types';

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
            <FlowTemplateCategoryCollapsible
              key={category.name}
              category={category}
              selectedCategories={selectedCategories}
              selectedServices={selectedServices}
              onCategoryFilterClick={onCategoryFilterClick}
              onServiceFilterClick={onServiceFilterClick}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

FlowTemplateFilterSidebar.displayName = 'FlowSidebar';

export { FlowTemplateFilterSidebar };
