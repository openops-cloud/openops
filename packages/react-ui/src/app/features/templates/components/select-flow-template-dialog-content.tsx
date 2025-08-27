import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useTheme } from '@/app/common/providers/theme-provider';
import { OPENOPS_CONNECT_TEMPLATES_URL } from '@/app/constants/cloud';
import { ExpandedTemplate } from '@/app/features/templates/components/expanded-template';
import { PrivateFlowTemplateFilterSidebarWrapper } from '@/app/features/templates/components/private-flow-template-filter-sidebar-wrapper';
import { authenticationSession } from '@/app/lib/authentication-session';
import {
  BranchLabelNode,
  FlowTemplateGallery,
  FlowTemplateMetadataWithIntegrations,
  LoopStepPlaceHolder,
  ReturnLoopedgeButton,
  StepPlaceHolder,
  TemplateDetails,
  TemplateEdge,
  TemplatesTabs,
  VerticalDivider,
} from '@openops/components/ui';
import { FlowTemplateDto, OpsEdition } from '@openops/shared';
import React from 'react';
import { popupFeatures } from '../../cloud/lib/popup';
import { useCloudProfile } from '../../cloud/lib/use-cloud-profile';
import { useUserInfoPolling } from '../../cloud/lib/use-user-info-polling';
import {
  FlowTemplateFilterSidebarProps,
  PublicFlowTemplateFilterSidebarWrapper,
} from './public-flow-template-filter-sidebar-wrapper';
import { TemplateStepNodeWithMetadata } from './template-step-node-with-metadata';
import { useOwnerLogoUrl } from './use-owner-logo-url';

const edgeTypes = {
  apEdge: TemplateEdge,
  apReturnEdge: ReturnLoopedgeButton,
};
const nodeTypes = {
  stepNode: TemplateStepNodeWithMetadata,
  placeholder: StepPlaceHolder,
  bigButton: StepPlaceHolder,
  loopPlaceholder: LoopStepPlaceHolder,
  branchLabel: BranchLabelNode,
};

export type SelectFlowTemplateDialogContentProps = {
  isExpanded: boolean;
  selectedTemplate: FlowTemplateDto | undefined;
  searchText: string;
  selectedTemplateMetadata: FlowTemplateMetadataWithIntegrations | undefined;
  templates: FlowTemplateMetadataWithIntegrations[] | undefined;
  isTemplateListLoading: boolean;
  handleTemplateSelect: (
    templateMetadata: FlowTemplateMetadataWithIntegrations,
  ) => void;
  isTemplatePreselected: boolean;
  closeDetails?: () => void;
  useTemplate: () => void;
  expandPreview: () => void;
  closeExpanded: () => void;
  onSearchInputChange: (search: string) => void;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  setSelectedBlocks: (blocks: string[]) => void;
} & FlowTemplateFilterSidebarProps;

const SelectFlowTemplateDialogContent = ({
  isExpanded,
  selectedTemplate,
  closeExpanded,
  selectedBlocks,
  selectedDomains,
  selectedServices,
  setSelectedBlocks,
  setSelectedDomains,
  setSelectedServices,
  selectedCategories,
  setSelectedCategories,
  searchText,
  selectedTemplateMetadata,
  isTemplatePreselected,
  closeDetails,
  useTemplate,
  expandPreview,
  templates,
  isTemplateListLoading,
  handleTemplateSelect,
  onSearchInputChange,
}: SelectFlowTemplateDialogContentProps) => {
  const { theme } = useTheme();
  const ownerLogoUrl = useOwnerLogoUrl();
  const { isConnectedToCloudTemplates } = useCloudProfile();
  const { createPollingInterval } = useUserInfoPolling();
  const useCloudTemplates = flagsHooks.useShouldFetchCloudTemplates();
  const { EDITION } = flagsHooks.useFlags().data;
  const isFullCatalog =
    !isTemplatePreselected &&
    (isConnectedToCloudTemplates || !useCloudTemplates);

  const [activeTab, setActiveTab] = React.useState<TemplatesTabs>(
    TemplatesTabs.Public,
  );

  const onExploreMoreClick = () => {
    const currentUser = authenticationSession.getCurrentUser();
    const popup = window.open(
      `${OPENOPS_CONNECT_TEMPLATES_URL}?projectId=${currentUser?.projectId}&userId=${currentUser?.id}`,
      'ConnectTemplates',
      popupFeatures,
    );

    if (!popup) {
      console.error(
        'Popup blocked! Could not load ' + OPENOPS_CONNECT_TEMPLATES_URL,
      );
    }

    createPollingInterval();
  };

  if (isExpanded && selectedTemplate) {
    return (
      <ExpandedTemplate
        templateName={selectedTemplate.name}
        edgeTypes={edgeTypes}
        nodeTypes={nodeTypes}
        template={selectedTemplate.template}
        close={closeExpanded}
        useTemplate={useTemplate}
      />
    );
  }

  const selectionHeading =
    selectedCategories[0] || selectedDomains[0] || selectedServices[0];

  return (
    <>
      <div className="w-[255px]">
        {activeTab === TemplatesTabs.Public ? (
          <PublicFlowTemplateFilterSidebarWrapper
            selectedBlocks={selectedBlocks}
            selectedDomains={selectedDomains}
            selectedServices={selectedServices}
            setSelectedBlocks={setSelectedBlocks}
            setSelectedDomains={setSelectedDomains}
            setSelectedServices={setSelectedServices}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            showDomains={isFullCatalog}
          />
        ) : (
          <PrivateFlowTemplateFilterSidebarWrapper />
        )}
      </div>
      <VerticalDivider className="h-full" />

      <div className="flex-1 overflow-hidden">
        {selectedTemplateMetadata ? (
          <TemplateDetails
            templateMetadata={selectedTemplateMetadata}
            template={selectedTemplate?.template}
            edgeTypes={edgeTypes}
            nodeTypes={nodeTypes}
            close={closeDetails}
            useTemplate={useTemplate}
            expandPreview={expandPreview}
            ownerLogoUrl={ownerLogoUrl}
            theme={theme}
          />
        ) : (
          <FlowTemplateGallery
            selectionHeading={selectionHeading}
            showPrivateTemplates={EDITION !== OpsEdition.COMMUNITY}
            publicTemplates={templates}
            privateTemplates={[]}
            isPublicTemplatesLoading={isTemplateListLoading}
            isPrivateTemplatesLoading={false}
            onTemplateSelect={handleTemplateSelect}
            searchText={searchText}
            onSearchInputChange={onSearchInputChange}
            isConnectedToCloud={isFullCatalog}
            onExploreMoreClick={onExploreMoreClick}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
      </div>
    </>
  );
};

SelectFlowTemplateDialogContent.displayName = 'SelectFlowTemplateDialogContent';
export { SelectFlowTemplateDialogContent };
