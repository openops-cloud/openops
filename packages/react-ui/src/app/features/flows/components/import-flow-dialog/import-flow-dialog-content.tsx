import { ConnectionsPicker } from '@/app/features/templates/components/connections-picker/connections-picker';
import { BlockMetadataModelSummary } from '@openops/blocks-framework';
import {
  Button,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FlowTemplateMetadataWithIntegrations,
  Input,
} from '@openops/components/ui';
import { AppConnectionWithoutSensitiveData, Trigger } from '@openops/shared';
import { t } from 'i18next';
import React, { useMemo, useRef, useState } from 'react';

type ImportFlowDialogContentProps = {
  templateWithIntegrations: FlowTemplateMetadataWithIntegrations | null;
  templateTrigger: Trigger | undefined;
  resetDialog: () => void;
  isUseTemplateLoading: boolean;
  onUseTemplate: (connections: AppConnectionWithoutSensitiveData[]) => void;
  handleFileParsing: (file: File | null) => void;
  isImportLoading: boolean;
};

const ImportFlowDialogContent = ({
  templateWithIntegrations,
  templateTrigger,
  resetDialog,
  isUseTemplateLoading,
  onUseTemplate,
  isImportLoading,
  handleFileParsing,
}: ImportFlowDialogContentProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
  };

  const onResetClick = () => {
    setFile(null);
    resetDialog();
  };

  const integrations: BlockMetadataModelSummary[] = useMemo(() => {
    return (
      templateWithIntegrations?.integrations.filter(
        (integration): integration is BlockMetadataModelSummary =>
          !!integration.auth,
      ) ?? []
    );
  }, [templateWithIntegrations]);

  if (templateWithIntegrations && templateTrigger) {
    return (
      <ConnectionsPicker
        close={onResetClick}
        templateName={templateWithIntegrations?.name ?? ''}
        templateTrigger={templateTrigger}
        integrations={integrations}
        onUseTemplate={onUseTemplate}
        isUseTemplateLoading={isUseTemplateLoading}
      ></ConnectionsPicker>
    );
  }
  return (
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
          onClick={() => handleFileParsing(file)}
          loading={isImportLoading}
          data-testid="importFlowButton"
          disabled={!file}
        >
          {t('Import')}
        </Button>
      </DialogFooter>
    </>
  );
};

ImportFlowDialogContent.displayName = 'ImportFlowDialogContent';
export { ImportFlowDialogContent };
