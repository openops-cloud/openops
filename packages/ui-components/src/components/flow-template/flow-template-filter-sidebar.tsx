import { BlockMetadataModelSummary } from '@openops/blocks-framework';
import { t } from 'i18next';
import { ChevronRight, Layers, LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../ui/collapsible';
import { ScrollArea } from '../../ui/scroll-area';
import { TooltipProvider } from '../../ui/tooltip';
import { OverflowTooltip } from '../overflow-tooltip';
import { DOMAIN_ICON_SUGGESTIONS } from './domain-icons';
import { replaceServicePrefix } from './template-utils';
import { TemplateSidebarCategory } from './types';

type FlowTemplateFilterItemProps = {
  value: string;
  displayName: string;
  onClick: (id: string) => void;
  isActive: boolean;
  logoUrl?: string;
  Icon?: LucideIcon;
};

const FlowTemplateFilterItem = ({
  value,
  displayName,
  isActive,
  onClick,
  logoUrl,
  Icon,
}: FlowTemplateFilterItemProps) => (
  <div
    aria-selected={isActive}
    role="option"
    className={cn(
      'w-full px-3 py-[10px] justify-start gap-2.5 inline-flex items-center overflow-hidden cursor-pointer hover:bg-muted',
      {
        'bg-muted': isActive,
      },
    )}
    onClick={() => onClick(value)}
  >
    <TooltipProvider>
      {Icon ? (
        <Icon className="size=5 text-slate-600 dark:text-primary" />
      ) : (
        logoUrl && <img src={logoUrl} alt={displayName} className="w-6 h-6" />
      )}
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
  <div className="px-3 py-[10px] justify-start items-end gap-2.5 inline-flex overflow-hidden">
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
  blocks?: BlockMetadataModelSummary[];
  selectedBlocks: string[];
  selectedDomains: string[];
  selectedServices: string[];
  selectedCategories: string[];
  onBlockFilterClick: (block: string) => void;
  onDomainFilterClick: (domain: string) => void;
  onServiceFilterClick: (service: string) => void;
  onCategoryFilterClick: (category: string) => void;
  clearFilters: () => void;
  categoryLogos?: Record<string, string>;
};

const FlowTemplateFilterSidebar = ({
  blocks,
  domains,
  categories,
  selectedBlocks,
  selectedDomains,
  selectedServices,
  selectedCategories,
  onDomainFilterClick,
  onServiceFilterClick,
  onBlockFilterClick,
  onCategoryFilterClick,
  clearFilters,
  categoryLogos,
}: FlowTemplateFilterSidebarProps) => {
  return (
    <div className="rounded-2xl flex-col justify-start items-start inline-flex h-full w-full px-4 pt-[25px] pb-8 bg-background">
      <ScrollArea className="h-full w-full flex-1">
        <FlowTemplateFilterItem
          value={''}
          displayName={t('All Templates')}
          onClick={clearFilters}
          isActive={
            selectedDomains.length === 0 && selectedServices.length === 0
          }
        />
        <FlowTemplateFilterHeader title={t('Cloud providers')} />
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
                {categoryLogos?.[category.name] && (
                  <img
                    src={categoryLogos[category.name]}
                    alt={category.name}
                    className="w-6 h-inherit mr-[10px]"
                  />
                )}
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

        <FlowTemplateFilterHeader title={t('FinOps capabilities')} />
        <div className="flex flex-col w-full">
          {domains.map((domain) => (
            <FlowTemplateFilterItem
              key={domain}
              value={domain}
              displayName={domain}
              onClick={onDomainFilterClick}
              isActive={selectedDomains.includes(domain)}
              Icon={DOMAIN_ICON_SUGGESTIONS[domain] ?? Layers}
            />
          ))}
        </div>

        {blocks && blocks.length > 0 && (
          <>
            <FlowTemplateFilterHeader title={t('FinOps platforms')} />
            <div className="flex flex-col w-full">
              {blocks.map((block) => (
                <FlowTemplateFilterItem
                  key={block.name}
                  value={block.name}
                  displayName={block.displayName}
                  onClick={onBlockFilterClick}
                  isActive={selectedBlocks.includes(block.name)}
                  logoUrl={block.logoUrl}
                />
              ))}
            </div>
          </>
        )}
      </ScrollArea>
    </div>
  );
};

FlowTemplateFilterSidebar.displayName = 'FlowSidebar';

export { FlowTemplateFilterSidebar };
