import { t } from 'i18next';
import { CircleArrowUp } from 'lucide-react';
import { cn } from '../../lib/cn';
import { DialogTitle } from '../../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { ExploreTemplates } from '../explore-templates';
import { SearchInput } from '../search-input/search-input';
import { FlowTemplateList } from './flow-template-list';
import { FlowTemplateMetadataWithIntegrations } from './types';
import { UpgradeToUseCompanyTemplatesBanner } from './upgrade-to-use-company-templates-banner';

type FlowTemplateGalleryProps = {
  isConnectedToCloud: boolean;
  publicTemplates: FlowTemplateMetadataWithIntegrations[] | undefined;
  privateTemplates: FlowTemplateMetadataWithIntegrations[] | undefined;
  isPublicTemplatesLoading: boolean;
  isPrivateTemplatesLoading: boolean;
  onTemplateSelect: (template: FlowTemplateMetadataWithIntegrations) => void;
  selectionHeading?: string;
  className?: string;
  searchText: string;
  onSearchInputChange: (searchText: string) => void;
  onExploreMoreClick: () => void;
  activeTab: TemplatesTabs;
  onTabChange: (tab: TemplatesTabs) => void;
};

export const enum TemplatesTabs {
  Public = 'public',
  Private = 'private',
}
const FlowTemplateGallery = ({
  isConnectedToCloud,
  publicTemplates,
  privateTemplates,
  isPublicTemplatesLoading,
  isPrivateTemplatesLoading,
  onTemplateSelect,
  selectionHeading,
  searchText,
  className,
  onSearchInputChange,
  onExploreMoreClick,
  activeTab,
  onTabChange,
}: FlowTemplateGalleryProps) => {
  return (
    <Tabs
      {...(activeTab !== undefined
        ? {
            value: activeTab,
            onValueChange: (v: string) => onTabChange?.(v as TemplatesTabs),
          }
        : { defaultValue: TemplatesTabs.Public })}
      className={cn(
        'h-full flex-1 flex flex-col gap-[14px] pl-7 pt-[34px] pr-[15px] overflow-y-hidden',
        className,
      )}
    >
      <TabsList className="w-full flex items-center justify-start gap-0 mb-5 bg-transparent border-none rounded-none">
        <TabsTrigger
          value={TemplatesTabs.Public}
          className="min-w-[265px] font-normal data-[state=active]:font-bold text-primary-300 text-base pl-0 pr-2 dark:text-white rounded-none  border-b-2 data-[state=active]:bg-background data-[state=active]:text-primary-300 data-[state=active]:dark:text-white data-[state=active]:shadow-none data-[state=active]:border-blueAccent-300"
        >
          <span className="mx-[14px] text-[24px]">
            {t('OpenOps Templates')}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value={TemplatesTabs.Private}
          className="!text-[24px] font-normal data-[state=active]:font-bold text-primary-300 text-base pr-0 pl-2 dark:text-white rounded-none border-b-2 data-[state=active]:bg-background data-[state=active]:text-primary-300 data-[state=active]:dark:text-white data-[state=active]:shadow-none data-[state=active]:border-blueAccent-300"
        >
          <div className="flex items-center justify-center gap-2 mx-[14px]">
            <span className="text-[24px]">{t('My Templates')}</span>
            <Tooltip>
              <TooltipTrigger asChild aria-label={t('Sample output info')}>
                <CircleArrowUp
                  className="text-black dark:text-white"
                  size={21}
                />
              </TooltipTrigger>
              <TooltipContent
                avoidCollisions
                hideWhenDetached
                side="bottom"
                className="font-medium text-left text-black max-w-[418px] text-wrap"
              >
                {t('Upgrade to unlock this feature')}
              </TooltipContent>
            </Tooltip>
          </div>
        </TabsTrigger>
      </TabsList>
      <div className="flex items-center justify-between">
        <DialogTitle className="text-[22px] font-medium text-primary-300 dark:text-primary">
          {selectionHeading || t('All templates')}
        </DialogTitle>
        <SearchInput
          placeholder={t('Search for template')}
          value={searchText}
          onChange={onSearchInputChange}
          className="max-w-[327px] mr-8"
        />
      </div>

      <TabsContent
        value={TemplatesTabs.Public}
        className="flex overflow-y-hidden"
      >
        <div className="flex-1 overflow-hidden">
          <FlowTemplateList
            templates={publicTemplates}
            isLoading={isPublicTemplatesLoading}
            onTemplateSelect={onTemplateSelect}
          >
            {!isConnectedToCloud && (
              <div className="w-full mb-6 mr-8">
                <ExploreTemplates
                  onExploreMoreClick={onExploreMoreClick}
                  className="max-w-full"
                />
              </div>
            )}
          </FlowTemplateList>
        </div>
      </TabsContent>
      <TabsContent
        value={TemplatesTabs.Private}
        className="flex items-center justify-center flex-1"
      >
        <UpgradeToUseCompanyTemplatesBanner
          link={'https://openops.com/contact'}
        />
      </TabsContent>
    </Tabs>
  );
};

FlowTemplateGallery.displayName = 'FlowTemplateGallery';
export { FlowTemplateGallery };
