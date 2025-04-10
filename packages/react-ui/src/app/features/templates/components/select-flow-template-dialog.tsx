import { Theme, useTheme } from '@/app/common/providers/theme-provider';
import { SEARCH_PARAMS } from '@/app/constants/search-params';
import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { ConnectionsPicker } from '@/app/features/templates/components/connections-picker/connections-picker';
import { ExpandedTemplate } from '@/app/features/templates/components/expanded-template';
import { useSelectFlowTemplateDialog } from '@/app/features/templates/lib/select-flow-template-dialog-hook';
import { templatesApi } from '@/app/features/templates/lib/templates-api';
import { templatesHooks } from '@/app/features/templates/lib/templates-hooks';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { userSettingsHooks } from '@/app/common/hooks/user-settings-hooks';
import { OPENOPS_CONNECT_TEMPLATES_URL } from '@/app/constants/cloud';
import { authenticationSession } from '@/app/lib/authentication-session';
import { BlockMetadataModelSummary } from '@openops/blocks-framework';
import {
  cn,
  Dialog,
  DialogContent,
  FlowTemplateFilterSidebar,
  FlowTemplateList,
  FlowTemplateMetadataWithIntegrations,
  INTERNAL_ERROR_TOAST,
  LoopStepPlaceHolder,
  ReturnLoopedgeButton,
  Skeleton,
  StepPlaceHolder,
  TemplateDetails,
  TemplateEdge,
  toast,
  VerticalDivider,
} from '@openops/components/ui';
import {
  AppConnectionWithoutSensitiveData,
  FlowTemplateDto,
} from '@openops/shared';
import { useMutation } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { popupFeatures } from '../../cloud/lib/popup';
import { useCloudProfile } from '../../cloud/lib/use-cloud-profile';
import { useUserInfoPolling } from '../../cloud/lib/use-user-info-polling';
import { cloudTemplatesApi } from '../lib/cloud-templates-api';
import { TemplateStepNodeWithMetadata } from './template-step-node-with-metadata';

type FlowTemplateFilterSidebarSkeletonLoaderProps = {
  numberOfSkeletons?: number;
};
const FlowTemplateFilterSidebarSkeletonLoader: React.FC<FlowTemplateFilterSidebarSkeletonLoaderProps> =
  React.memo(
    ({
      numberOfSkeletons = 3,
    }: FlowTemplateFilterSidebarSkeletonLoaderProps) => {
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
    },
  );

FlowTemplateFilterSidebarSkeletonLoader.displayName =
  'FlowTemplateFilterSidebarSkeletonLoader';

const edgeTypes = {
  apEdge: TemplateEdge,
  apReturnEdge: ReturnLoopedgeButton,
};
const nodeTypes = {
  stepNode: TemplateStepNodeWithMetadata,
  placeholder: StepPlaceHolder,
  bigButton: StepPlaceHolder,
  loopPlaceholder: LoopStepPlaceHolder,
};

type FlowTemplateFilterSidebarProps = {
  selectedDomains: string[];
  selectedServices: string[];
  setSelectedDomains: (domains: string[]) => void;
  setSelectedServices: (services: string[]) => void;
};

const FlowTemplateFilterSidebarWrapper = ({
  selectedDomains,
  selectedServices,
  setSelectedDomains,
  setSelectedServices,
}: FlowTemplateFilterSidebarProps) => {
  const useCloudTemplates = flagsHooks.useShouldFetchCloudTemplates();

  const { domains, services, isLoading, status, isError } =
    templatesHooks.useTemplateFilters({
      enabled: true,
      useCloudTemplates,
      gettingStartedTemplateFilter: 'exclude',
    });

  if (isLoading || status === 'pending') {
    return <FlowTemplateFilterSidebarSkeletonLoader numberOfSkeletons={12} />;
  }

  if (isError) {
    toast(INTERNAL_ERROR_TOAST);
    return null;
  }

  const onDomainFilterClick = (domain: string) => {
    setSelectedDomains(selectedDomains.includes(domain) ? [] : [domain]);
    setSelectedServices([]);
  };

  const onServiceFilterClick = (service: string) => {
    setSelectedServices(selectedServices.includes(service) ? [] : [service]);
    setSelectedDomains([]);
  };

  const clearFilters = () => {
    setSelectedDomains([]);
    setSelectedServices([]);
  };

  return (
    <FlowTemplateFilterSidebar
      domains={domains}
      services={services}
      selectedDomains={selectedDomains}
      selectedServices={selectedServices}
      onDomainFilterClick={onDomainFilterClick}
      onServiceFilterClick={onServiceFilterClick}
      clearFilters={clearFilters}
    />
  );
};

const useOwnerLogoUrl = () => {
  const { theme } = useTheme();
  const branding = flagsHooks.useWebsiteBranding();

  const [ownerLogoUrl, setOwnerLogoUrl] = useState(
    branding.logos.logoIconPositiveUrl,
  );

  useEffect(() => {
    setOwnerLogoUrl(() => {
      return theme === Theme.LIGHT
        ? branding.logos.logoIconPositiveUrl
        : branding.logos.logoIconUrl;
    });
  }, [branding, theme]);

  return ownerLogoUrl;
};

FlowTemplateFilterSidebar.displayName = 'FlowTemplateFilterSidebar';

type SelectFlowTemplateDialogContentProps = {
  isExpanded: boolean;
  selectedTemplate: FlowTemplateDto | undefined;
  searchInitialValue: string;
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
} & FlowTemplateFilterSidebarProps;

const SelectFlowTemplateDialogContent = ({
  isExpanded,
  selectedTemplate,
  closeExpanded,
  selectedDomains,
  selectedServices,
  setSelectedDomains,
  setSelectedServices,
  searchInitialValue,
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

  return (
    <>
      {isFullCatalog && (
        <>
          <div className="w-[255px]">
            <FlowTemplateFilterSidebarWrapper
              selectedDomains={selectedDomains}
              selectedServices={selectedServices}
              setSelectedDomains={setSelectedDomains}
              setSelectedServices={setSelectedServices}
            />
          </div>
          <VerticalDivider className="h-full" />
        </>
      )}
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
          />
        ) : (
          <FlowTemplateList
            templates={templates}
            isLoading={isTemplateListLoading}
            onTemplateSelect={handleTemplateSelect}
            searchInitialValue={searchInitialValue}
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

const SelectFlowTemplateDialog = ({
  isOpen,
  onOpenChange,
  preselectedSelectedTemplateMetadata,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedSelectedTemplateMetadata?: FlowTemplateMetadataWithIntegrations;
}) => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const { updateHomePageOperationalViewFlag } =
    userSettingsHooks.useHomePageOperationalView();

  const {
    isConnectionsPickerOpen,
    setIsConnectionsPickerOpen,
    selectedTemplate,
    setSelectedTemplate,
    selectedTemplateMetadata,
    setSelectedTemplateMetadata,
    isExpanded,
    setIsExpanded,
    resetTemplateDialog,
  } = useSelectFlowTemplateDialog(preselectedSelectedTemplateMetadata);

  const navigate = useNavigate();

  useEffect(() => {
    setSelectedDomains([]);
    setSelectedServices([]);
    resetTemplateDialog();
  }, [isOpen, resetTemplateDialog, searchText]);

  useEffect(() => {
    resetTemplateDialog();
  }, [selectedServices, selectedDomains, resetTemplateDialog]);

  const useCloudTemplates = flagsHooks.useShouldFetchCloudTemplates();

  const { templatesWithIntegrations, isLoading: isTemplateListLoading } =
    templatesHooks.useTemplatesMetadataWithIntegrations({
      enabled: isOpen,
      search: searchText,
      domains: selectedDomains,
      services: selectedServices,
      useCloudTemplates,
      gettingStartedTemplateFilter: 'exclude',
    });

  const { mutate: getSelectedTemplate } = useMutation({
    mutationFn: async ({
      templateId,
      useCloudTemplates,
    }: {
      templateId: string;
      useCloudTemplates: boolean;
    }) => {
      const templatesApiToUse = useCloudTemplates
        ? cloudTemplatesApi
        : templatesApi;

      return templatesApiToUse.getTemplate(templateId);
    },
    onSuccess: (template) => {
      setSelectedTemplate(template);
    },
    onError: () => {
      toast(INTERNAL_ERROR_TOAST);
    },
  });

  const { mutate: useTemplate, isPending: isUseTemplatePending } = useMutation({
    mutationFn: async (connections: AppConnectionWithoutSensitiveData[]) => {
      if (!selectedTemplate) {
        return Promise.reject();
      }

      const template = await cloudTemplatesApi.getTemplate(selectedTemplate.id);
      return await flowsApi.create({
        template: {
          id: template.id,
          displayName: template.name,
          description: template.description,
          isSample: template.isSample ?? false,
          trigger: template.template,
        },
        connectionIds: connections.map((c) => c.id),
      });
    },
    onSuccess: (flow) => {
      updateHomePageOperationalViewFlag();
      navigate(`/flows/${flow.id}?${SEARCH_PARAMS.viewOnly}=false`);
    },
    onError: () => {
      toast(INTERNAL_ERROR_TOAST);
    },
  });

  useEffect(() => {
    if (preselectedSelectedTemplateMetadata) {
      getSelectedTemplate({
        templateId: preselectedSelectedTemplateMetadata.id,
        useCloudTemplates,
      });
    }
  }, [
    getSelectedTemplate,
    preselectedSelectedTemplateMetadata,
    useCloudTemplates,
  ]);

  const closeDetails = () => {
    resetTemplateDialog();
  };

  const closeExpanded = () => {
    setIsExpanded(false);
  };

  const expandPreview = () => {
    setIsExpanded(true);
  };

  const handleTemplateSelect = (
    templateMetadata: FlowTemplateMetadataWithIntegrations,
  ) => {
    setSelectedTemplateMetadata(templateMetadata);
    getSelectedTemplate({
      templateId: templateMetadata.id,
      useCloudTemplates,
    });
  };

  const { isConnectedToCloudTemplates } = useCloudProfile();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col p-0 transition-none max-w-[1360px] max-2xl:max-w-[1010px]',
          {
            'max-w-[1157px] max-2xl:max-w-[1157px]':
              useCloudTemplates &&
              !isConnectedToCloudTemplates &&
              !isConnectionsPickerOpen,
            'max-w-[846px] max-h-[70vh] overflow-y-auto':
              isConnectionsPickerOpen,
            'h-[90vh]': !isConnectionsPickerOpen,
          },
        )}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        {selectedTemplateMetadata && isConnectionsPickerOpen ? (
          <ConnectionsPicker
            close={() => setIsConnectionsPickerOpen(false)}
            templateName={selectedTemplate?.name ?? ''}
            integrations={
              selectedTemplateMetadata.integrations.filter(
                (integration) => !!integration.auth,
              ) as BlockMetadataModelSummary[]
            }
            onUseTemplate={useTemplate}
            isUseTemplateLoading={isUseTemplatePending}
          ></ConnectionsPicker>
        ) : (
          <div className="h-full w-full flex bg-background rounded-2xl">
            <SelectFlowTemplateDialogContent
              isExpanded={isExpanded}
              selectedTemplate={selectedTemplate}
              closeExpanded={closeExpanded}
              selectedDomains={selectedDomains}
              setSelectedDomains={setSelectedDomains}
              selectedServices={selectedServices}
              setSelectedServices={setSelectedServices}
              selectedTemplateMetadata={selectedTemplateMetadata}
              isTemplatePreselected={!!preselectedSelectedTemplateMetadata}
              closeDetails={
                preselectedSelectedTemplateMetadata ? undefined : closeDetails
              }
              useTemplate={() => setIsConnectionsPickerOpen(true)}
              expandPreview={expandPreview}
              templates={templatesWithIntegrations}
              isTemplateListLoading={isTemplateListLoading}
              handleTemplateSelect={handleTemplateSelect}
              searchInitialValue={searchText}
              onSearchInputChange={setSearchText}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

SelectFlowTemplateDialog.displayName = 'SelectFlowTemplateDialog';
export { SelectFlowTemplateDialog };
