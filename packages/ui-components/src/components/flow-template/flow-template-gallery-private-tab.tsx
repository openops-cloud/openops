import { FlowTemplateList } from './flow-template-list';
import { NoPrivateTemplatesCatalog } from './no-private-templates-catalog';
import { FlowTemplateMetadataWithIntegrations } from './types';
import { UpgradeToUseCompanyTemplatesBanner } from './upgrade-to-use-company-templates-banner';

type FlowTemplateGalleryPrivateTabProps = {
  showPrivateTemplates: boolean;
  isPrivateCatalogCreated: boolean;
  isPrivateTemplatesLoading: boolean;
  privateTemplates?: FlowTemplateMetadataWithIntegrations[];
  onTemplateSelect: (template: FlowTemplateMetadataWithIntegrations) => void;
};

const FlowTemplateGalleryPrivateTab = ({
  showPrivateTemplates,
  isPrivateCatalogCreated,
  isPrivateTemplatesLoading,
  onTemplateSelect,
  privateTemplates,
}: FlowTemplateGalleryPrivateTabProps) => {
  if (!showPrivateTemplates) {
    return (
      <div className="h-full w-full flex items-center justify-center pb-[20%]">
        <UpgradeToUseCompanyTemplatesBanner
          link={'https://openops.com/contact'}
        />
      </div>
    );
  }

  if (!isPrivateCatalogCreated) {
    return <NoPrivateTemplatesCatalog />;
  }

  return (
    <FlowTemplateList
      showAuthor={false}
      templates={privateTemplates}
      isLoading={isPrivateTemplatesLoading}
      onTemplateSelect={onTemplateSelect}
    />
  );
};
FlowTemplateGalleryPrivateTab.displayName = 'FlowTemplateGalleryPrivateTab';
export { FlowTemplateGalleryPrivateTab };
