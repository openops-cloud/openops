import { SEARCH_PARAMS } from '@/app/constants/search-params';
import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { ConnectionsPicker } from '@/app/features/templates/components/connections-picker/connections-picker';
import { useSelectFlowTemplateDialog } from '@/app/features/templates/lib/select-flow-template-dialog-hook';
import { templatesApi } from '@/app/features/templates/lib/templates-api';
import { templatesHooks } from '@/app/features/templates/lib/templates-hooks';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { userSettingsHooks } from '@/app/common/hooks/user-settings-hooks';
import { usePrivateTemplates } from '@/app/features/templates/lib/private-templates-hook';
import { BlockMetadataModelSummary } from '@openops/blocks-framework';
import {
  cn,
  Dialog,
  DialogContent,
  DialogTitle,
  FlowTemplateMetadataWithIntegrations,
  INTERNAL_ERROR_TOAST,
  TemplatesTabs,
  toast,
} from '@openops/components/ui';
import { AppConnectionsWithSupportedBlocks } from '@openops/shared';
import { useMutation } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounceValue } from 'usehooks-ts';
import { useCloudProfile } from '../../cloud/lib/use-cloud-profile';
import { cloudTemplatesApi } from '../lib/cloud-templates-api';
import { SelectFlowTemplateDialogContent } from './select-flow-template-dialog-content';

const TEMPLATE_FILTER_DEBOUNCE_DELAY = 300;

const SelectFlowTemplateDialog = ({
  isOpen,
  onOpenChange,
  preselectedSelectedTemplateMetadata,
  preselectedTab,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedSelectedTemplateMetadata?: FlowTemplateMetadataWithIntegrations;
  preselectedTab?: TemplatesTabs;
}) => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const { updateHomePageOperationalViewFlag } =
    userSettingsHooks.useHomePageOperationalView();
  const [activeTab, setActiveTab] = React.useState<TemplatesTabs>(
    TemplatesTabs.Public,
  );

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
    setSelectedCategories([]);
    setSelectedBlocks([]);
    resetTemplateDialog();
  }, [isOpen, resetTemplateDialog]);

  useEffect(() => {
    setSearchText('');
  }, [selectedServices, selectedDomains, selectedCategories, selectedBlocks]);

  useEffect(() => {
    resetTemplateDialog();
  }, [selectedServices, selectedDomains, resetTemplateDialog]);

  useEffect(() => {
    if (preselectedTab) {
      setActiveTab(preselectedTab);
    }
  }, [preselectedTab]);

  const useCloudTemplates = flagsHooks.useShouldFetchCloudTemplates();

  const [debouncedSearchText] = useDebounceValue(
    searchText,
    TEMPLATE_FILTER_DEBOUNCE_DELAY,
  );

  const { isConnectedToCloudTemplates } = useCloudProfile();

  const { templatesWithIntegrations, isLoading: isTemplateListLoading } =
    templatesHooks.useTemplatesMetadataWithIntegrations({
      enabled: isOpen,
      search: debouncedSearchText,
      blocks: selectedBlocks,
      domains: selectedDomains,
      services: selectedServices,
      categories: selectedCategories,
      useCloudTemplates,
      gettingStartedTemplateFilter: 'exclude',
      isConnectedToCloudTemplates,
    });

  const {
    privateTemplates,
    isPrivateTemplatesLoading,
    isPrivateCatalogCreated,
  } = usePrivateTemplates();

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
    mutationFn: async (connections: AppConnectionsWithSupportedBlocks[]) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTitle className="hidden">OpenOps templates Catalog</DialogTitle>

      <DialogContent
        className={cn(
          'flex flex-col p-0 transition-none max-w-[1360px] max-2xl:max-w-[1010px]',
          {
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
            name={selectedTemplate?.name ?? ''}
            integrations={
              selectedTemplateMetadata.integrations.filter(
                (integration) => !!integration.auth,
              ) as BlockMetadataModelSummary[]
            }
            onUseConnections={useTemplate}
            isLoading={isUseTemplatePending}
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
              isPrivateCatalogCreated={isPrivateCatalogCreated}
              publicTemplates={templatesWithIntegrations}
              isPublicTemplatesLoading={isTemplateListLoading}
              privateTemplates={privateTemplates}
              isPrivateTemplatesLoading={isPrivateTemplatesLoading}
              handleTemplateSelect={handleTemplateSelect}
              searchText={searchText}
              onSearchInputChange={setSearchText}
              selectedBlocks={selectedBlocks}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              setSelectedBlocks={setSelectedBlocks}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

SelectFlowTemplateDialog.displayName = 'SelectFlowTemplateDialog';
export { SelectFlowTemplateDialog };
