import {
  INTERNAL_ERROR_TOAST,
  RenameDialog,
  toast,
} from '@openops/components/ui';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import React from 'react';

import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { useRefetchFolderTree } from '@/app/features/folders/hooks/refetch-folder-tree';
import { FlowOperationType, PopulatedFlow } from '@openops/shared';

type RenameFlowDialogProps = {
  children: React.ReactNode;
  currentName: string;
  onRename: (newName: string) => void;
  flowId: string;
  dialogTitle?: string;
  nameLabel?: string;
  placeholder?: string;
  confirmLabel?: string;
  successToastDescription?: string;
};
const RenameFlowDialog: React.FC<RenameFlowDialogProps> = ({
  children,
  currentName,
  onRename,
  flowId,
  dialogTitle,
  nameLabel,
  placeholder,
  confirmLabel,
  successToastDescription,
}) => {
  const refetchFolderTree = useRefetchFolderTree();

  const { mutate } = useMutation<PopulatedFlow, Error, { displayName: string }>(
    {
      mutationFn: ({ displayName }: { displayName: string }) => {
        return flowsApi.update(flowId, {
          type: FlowOperationType.CHANGE_NAME,
          request: { displayName },
        });
      },
      onSuccess: (_, { displayName }) => {
        refetchFolderTree();
        onRename(displayName);
        toast({
          title: t('Success'),
          description:
            successToastDescription ?? t('Workflow has been renamed.'),
          duration: 3000,
        });
      },
    },
  );

  return (
    <RenameDialog
      currentName={currentName}
      dialogTitle={dialogTitle ?? t('Rename Workflow')}
      nameLabel={nameLabel ?? t('Name')}
      placeholder={placeholder ?? t('New Workflow Name')}
      confirmLabel={confirmLabel ?? t('Confirm')}
      onSubmit={(newName) => mutate({ displayName: newName })}
      onError={() => toast(INTERNAL_ERROR_TOAST)}
    >
      {children}
    </RenameDialog>
  );
};

export { RenameFlowDialog };
