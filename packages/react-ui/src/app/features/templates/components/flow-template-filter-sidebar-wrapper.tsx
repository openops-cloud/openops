import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { templatesHooks } from '@/app/features/templates/lib/templates-hooks';
import {
  FlowTemplateFilterSidebar,
  INTERNAL_ERROR_TOAST,
  Skeleton,
  TemplateSidebarCategory,
  toast,
} from '@openops/components/ui';
import { BlockCategory } from '@openops/shared';
import React, { useEffect, useMemo } from 'react';
import { blocksHooks } from '../../blocks/lib/blocks-hook';

export type FlowTemplateFilterSidebarProps = {
  selectedBlocks: string[];
  selectedDomains: string[];
  selectedServices: string[];
  setSelectedBlocks: (blocks: string[]) => void;
  setSelectedDomains: (domains: string[]) => void;
  setSelectedServices: (services: string[]) => void;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
};

export const FlowTemplateFilterSidebarSkeletonLoader: React.FC<{
  numberOfSkeletons?: number;
}> = React.memo(({ numberOfSkeletons = 3 }) => {
  return (
    <div className="gap-2 h-full w-full p-4">
      <div className="flex flex-col h-full gap-2 overflow-y-hidden">
        {[...Array(numberOfSkeletons)].map((_, index) => (
          <div key={index} className="flex flex-col items-center w-full">
            <div className="w-full">
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

FlowTemplateFilterSidebarSkeletonLoader.displayName =
  'FlowTemplateFilterSidebarSkeletonLoader';

const FlowTemplateFilterSidebarWrapper = ({
  selectedBlocks,
  selectedDomains,
  selectedServices,
  setSelectedDomains,
  setSelectedServices,
  selectedCategories,
  setSelectedCategories,
  setSelectedBlocks,
  showDomains = true,
}: FlowTemplateFilterSidebarProps & { showDomains?: boolean }) => {
  const useCloudTemplates = flagsHooks.useShouldFetchCloudTemplates();

  const {
    domains,
    categories,
    blocks: templateBlockNames,
    isLoading: isTemplateFiltersLoading,
    status,
    isError,
    refetch: refetchTemplateFilters,
  } = templatesHooks.useTemplateFilters({
    enabled: true,
    useCloudTemplates,
    gettingStartedTemplateFilter: 'exclude',
  });

  const { blocks, isLoading: isBlocksLoading } = blocksHooks.useBlocks({
    categories: [BlockCategory.FINOPS],
  });

  const { blocks: cloudBlocks } = blocksHooks.useBlocks({
    categories: [BlockCategory.CLOUD],
  });

  useEffect(() => {
    if (showDomains) {
      refetchTemplateFilters();
    }
  }, [refetchTemplateFilters, showDomains]);

  const categoryLogos = useMemo(() => {
    if (!categories || !cloudBlocks) return {} as Record<string, string>;

    return categories.reduce((acc, category: TemplateSidebarCategory) => {
      const block = cloudBlocks.find((block) => {
        const normalizedName = category.name.toLowerCase();

        return (
          block.name.includes(normalizedName) ||
          block.displayName.toLowerCase().includes(normalizedName)
        );
      });
      if (block) {
        acc[category.name] = block.logoUrl;
      }
      return acc;
    }, {} as Record<string, string>);
  }, [cloudBlocks, categories]);

  const blocksWithTemplates = blocks?.filter((block) =>
    templateBlockNames?.includes(block.name),
  );

  if (isTemplateFiltersLoading || isBlocksLoading || status === 'pending') {
    return <FlowTemplateFilterSidebarSkeletonLoader numberOfSkeletons={12} />;
  }

  if (isError) {
    toast(INTERNAL_ERROR_TOAST);
    return null;
  }

  const onBlockFilterClick = (block: string) => {
    setSelectedBlocks(selectedBlocks.includes(block) ? [] : [block]);
    setSelectedDomains([]);
    setSelectedServices([]);
    setSelectedCategories([]);
  };

  const onDomainFilterClick = (domain: string) => {
    setSelectedDomains(selectedDomains.includes(domain) ? [] : [domain]);
    setSelectedServices([]);
    setSelectedBlocks([]);
  };

  const onServiceFilterClick = (service: string) => {
    setSelectedServices(selectedServices.includes(service) ? [] : [service]);
    setSelectedDomains([]);
    setSelectedCategories([]);
    setSelectedBlocks([]);
  };

  const onCategoryFilterClick = (category: string) => {
    if (category === '') {
      setSelectedCategories([]);
      setSelectedServices([]);
      setSelectedBlocks([]);
      return;
    }

    setSelectedCategories(
      selectedCategories.includes(category) ? [] : [category],
    );
    setSelectedDomains([]);
    setSelectedServices([]);
    setSelectedBlocks([]);
  };

  const clearFilters = () => {
    setSelectedDomains([]);
    setSelectedServices([]);
    setSelectedCategories([]);
    setSelectedBlocks([]);
  };

  return (
    <FlowTemplateFilterSidebar
      blocks={blocksWithTemplates}
      domains={domains}
      categories={categories}
      selectedBlocks={selectedBlocks}
      selectedDomains={selectedDomains}
      selectedServices={selectedServices}
      onBlockFilterClick={onBlockFilterClick}
      onDomainFilterClick={onDomainFilterClick}
      onServiceFilterClick={onServiceFilterClick}
      onCategoryFilterClick={onCategoryFilterClick}
      clearFilters={clearFilters}
      selectedCategories={selectedCategories}
      categoryLogos={categoryLogos}
      showDomains={showDomains}
    />
  );
};

FlowTemplateFilterSidebarWrapper.displayName =
  'FlowTemplateFilterSidebarWrapper';

export { FlowTemplateFilterSidebarWrapper };
