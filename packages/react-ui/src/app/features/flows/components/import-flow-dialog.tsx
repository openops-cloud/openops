import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  INTERNAL_ERROR_TOAST,
  toast,
} from '@openops/components/ui';
import {
  AppConnectionWithoutSensitiveData,
  FlowImportTemplate,
  FlowOperationType,
} from '@openops/shared';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { flowsApi } from '../lib/flows-api';

import { userSettingsHooks } from '@/app/common/hooks/user-settings-hooks';
import { SEARCH_PARAMS } from '@/app/constants/search-params';
import { ConnectionsPicker } from '@/app/features/templates/components/connections-picker/connections-picker';
import { templatesHooks } from '@/app/features/templates/lib/templates-hooks';
import { authenticationSession } from '@/app/lib/authentication-session';
import { BlockMetadataModelSummary } from '@openops/blocks-framework';

const ImportFlowDialog = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedWorkflow, setImportedWorkflow] =
    useState<FlowImportTemplate | null>(null);
  const { updateHomePageOperationalViewFlag } =
    userSettingsHooks.useHomePageOperationalView();
  const { templateWithIntegrations, isLoading } =
    templatesHooks.useTemplateMetadataWithIntegrations(importedWorkflow);

  const { mutate: createFlow, isPending } = useMutation({
    mutationFn: async (connections: AppConnectionWithoutSensitiveData[]) => {
      if (importedWorkflow) {
        const newFlow = await flowsApi.create({
          displayName: importedWorkflow.name,
          projectId: authenticationSession.getProjectId()!,
        });
        return await flowsApi.update(newFlow.id, {
          type: FlowOperationType.IMPORT_FLOW,
          request: {
            displayName: importedWorkflow.name,
            description: importedWorkflow.description,
            trigger: importedWorkflow.template.trigger,
            connections,
          },
        });
      }
      return Promise.reject();
    },
    onSuccess: (flow) => {
      updateHomePageOperationalViewFlag();
      navigate(`/flows/${flow.id}?${SEARCH_PARAMS.viewOnly}=true`);
    },
    onError: () => {
      toast(INTERNAL_ERROR_TOAST);
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] || null);
  };

  const handleSubmit = async () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const template = JSON.parse(
          reader.result as string,
        ) as FlowImportTemplate;
        // TODO handle overwriting flow when using actions in builder
        if (template && template.name && template.template) {
          setImportedWorkflow(template);
        }
      } catch (error) {
        toast(INTERNAL_ERROR_TOAST);
      }
    };
    reader.readAsText(file);
  };

  const resetDialog = () => {
    setFile(null);
    setImportedWorkflow(null);
  };

  return (
    <Dialog onOpenChange={resetDialog}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={cn({
          'flex flex-col p-0 transition-none max-2xl:max-w-[1010px] max-w-[846px] max-h-[70vh] overflow-y-auto':
            templateWithIntegrations,
        })}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        {templateWithIntegrations ? (
          <ConnectionsPicker
            close={() => {
              resetDialog();
            }}
            templateName={templateWithIntegrations?.name ?? ''}
            integrations={
              templateWithIntegrations?.integrations.filter(
                (integration) => !!integration.auth,
              ) as BlockMetadataModelSummary[]
            }
            onUseTemplate={createFlow}
            isUseTemplateLoading={isPending}
          ></ConnectionsPicker>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('Import Workflow')}</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                data-testid="importFlowFileInput"
              />
              <Button
                onClick={handleSubmit}
                loading={isLoading}
                data-testid="importFlowButton"
                disabled={!file}
              >
                {t('Import')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { ImportFlowDialog };
