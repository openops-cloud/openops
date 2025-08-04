import { t } from 'i18next';
import { cn } from '../../lib/cn';
import { DialogDescription, DialogTitle } from '../../ui/dialog';
import { ScrollArea } from '../../ui/scroll-area';
import { LoadingSpinner } from '../../ui/spinner';
import { ExploreTemplates } from '../explore-templates';
import { SearchInput } from '../search-input/search-input';
import { FlowTemplateCard } from './flow-template-card';
import { NoTemplatesPlaceholder } from './no-templates-placeholder';
import { FlowTemplateMetadataWithIntegrations } from './types';

type FlowTemplateListProps = {
  templates: FlowTemplateMetadataWithIntegrations[] | undefined;
  isLoading: boolean;
  searchText: string;
  onTemplateSelect: (template: FlowTemplateMetadataWithIntegrations) => void;
  onSearchInputChange: (filter: string) => void;
  ownerLogoUrl: string;
  isFullCatalog: boolean;
  onExploreMoreClick: () => void;
};

const FlowTemplateList = ({
  templates,
  isLoading,
  searchText,
  onTemplateSelect,
  onSearchInputChange,
  ownerLogoUrl,
  isFullCatalog,
  onExploreMoreClick,
}: FlowTemplateListProps) => {
  return (
    <div
      className={cn(
        'h-full flex-1 flex flex-col gap-[14px] pl-7 pt-[34px] pr-[15px]',
        {
          'px-[48px]': !isFullCatalog,
        },
      )}
    >
      <div className="flex items-center justify-between">
        <DialogTitle className="text-[32px] font-bold text-primary-300 dark:text-primary">
          {t('Templates catalog')}
        </DialogTitle>
        {isFullCatalog && (
          <SearchInput
            placeholder={t('Search for template')}
            value={searchText}
            onChange={onSearchInputChange}
            className="max-w-[327px] mr-8"
          />
        )}
      </div>
      {isFullCatalog && (
        <DialogDescription className="text-2xl font-medium text-primary-300 dark:text-primary">
          {t('All templates')}
        </DialogDescription>
      )}

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center w-full">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {templates?.length === 0 && <NoTemplatesPlaceholder />}
          <ScrollArea type="auto">
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
              {!isFullCatalog && (
                <div className="w-full mb-6">
                  <ExploreTemplates onExploreMoreClick={onExploreMoreClick} />
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
};

FlowTemplateList.displayName = 'FlowTemplateList';
export { FlowTemplateList };
