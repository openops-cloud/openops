import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useTheme } from '@/app/common/providers/theme-provider';
import { OPENOPS_CONNECT_TEMPLATES_URL } from '@/app/constants/cloud';
import { ExpandedTemplate } from '@/app/features/templates/components/expanded-template';
import { authenticationSession } from '@/app/lib/authentication-session';
import {
  BranchLabelNode,
  FlowTemplateList,
  FlowTemplateMetadataWithIntegrations,
  LoopStepPlaceHolder,
  ReturnLoopedgeButton,
  StepPlaceHolder,
  TemplateDetails,
  TemplateEdge,
  VerticalDivider,
} from '@openops/components/ui';
import { FlowTemplateDto } from '@openops/shared';
import React from 'react';
import { popupFeatures } from '../../cloud/lib/popup';
import { useCloudProfile } from '../../cloud/lib/use-cloud-profile';
import { useUserInfoPolling } from '../../cloud/lib/use-user-info-polling';
import {
  FlowTemplateFilterSidebarProps,
  FlowTemplateFilterSidebarWrapper,
} from './flow-template-filter-sidebar-wrapper';
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

export const SelectFlowTemplateDialogContent = ({
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
  const isFullCatalog =
    !isTemplatePreselected &&
    (isConnectedToCloudTemplates || !useCloudTemplates);

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
        <FlowTemplateFilterSidebarWrapper
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
          <FlowTemplateList
            selectionHeading={selectionHeading}
            templates={templates}
            isLoading={isTemplateListLoading}
            onTemplateSelect={handleTemplateSelect}
            searchText={searchText}
            onSearchInputChange={onSearchInputChange}
            ownerLogoUrl={ownerLogoUrl}
            isFullCatalog={isFullCatalog}
            onExploreMoreClick={onExploreMoreClick}
          ></FlowTemplateList>
        )}
      </div>
    </>
  );
};

SelectFlowTemplateDialogContent.displayName = 'SelectFlowTemplateDialogContent';
