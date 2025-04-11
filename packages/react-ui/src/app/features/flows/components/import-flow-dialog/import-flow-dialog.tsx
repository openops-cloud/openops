import {
  cn,
  Dialog,
  DialogContent,
  DialogTrigger,
  INTERNAL_ERROR_TOAST,
  toast,
} from '@openops/components/ui';
import {
  AppConnectionWithoutSensitiveData,
  FlowImportTemplate,
  FlowOperationType,
} from '@openops/shared';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { flowsApi } from '../../lib/flows-api';

import { userSettingsHooks } from '@/app/common/hooks/user-settings-hooks';
import { SEARCH_PARAMS } from '@/app/constants/search-params';
import { ImportFlowDialogContent } from '@/app/features/flows/components/import-flow-dialog/import-flow-dialog-content';
import { templatesHooks } from '@/app/features/templates/lib/templates-hooks';
import { authenticationSession } from '@/app/lib/authentication-session';

const ImportFlowDialog = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [importedWorkflow, setImportedWorkflow] =
    useState<FlowImportTemplate | null>(null);
  const { updateHomePageOperationalViewFlag } =
    userSettingsHooks.useHomePageOperationalView();
  const { templateWithIntegrations, isLoading: isImportLoading } =
    templatesHooks.useSetTemplateIntegrations(importedWorkflow);

  const { mutate: createFlow, isPending: isUseTemplateLoading } = useMutation({
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

  const handleFileParsing = async (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const template = JSON.parse(
          reader.result as string,
        ) as FlowImportTemplate;
        if (template?.name && template?.template?.trigger) {
          setImportedWorkflow(template);
        } else {
          toast(INTERNAL_ERROR_TOAST);
        }
      } catch {
        toast(INTERNAL_ERROR_TOAST);
      }
    };
    reader.readAsText(file);
  };

  const resetDialog = () => {
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
        <ImportFlowDialogContent
          templateWithIntegrations={templateWithIntegrations}
          templateTrigger={importedWorkflow?.template.trigger}
          resetDialog={resetDialog}
          isUseTemplateLoading={isUseTemplateLoading}
          onUseTemplate={createFlow}
          handleFileParsing={handleFileParsing}
          isImportLoading={isImportLoading}
        />
      </DialogContent>
    </Dialog>
  );
};

export { ImportFlowDialog };
