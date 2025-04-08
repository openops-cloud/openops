import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  INTERNAL_ERROR_TOAST,
  LoadingSpinner,
  toast,
  WarningWithIcon,
} from '@openops/components/ui';
import { Flow, FlowOperationType, FlowVersion } from '@openops/shared';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import {
  Copy,
  CornerUpLeft,
  Download,
  Import,
  Pencil,
  TextCursorInput,
  Trash2,
} from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { ConfirmationDeleteDialog } from '@/app/common/components/delete-dialog';
import { userSettingsHooks } from '@/app/common/hooks/user-settings-hooks';
import { SEARCH_PARAMS } from '@/app/constants/search-params';
import { ImportFlowDialog } from '@/app/features/flows/components/import-flow-dialog/import-flow-dialog';
import { useRefetchFolderTree } from '@/app/features/folders/hooks/refetch-folder-tree';
import { authenticationSession } from '@/app/lib/authentication-session';
import { flowsApi } from '../lib/flows-api';
import { flowsUtils } from '../lib/flows-utils';
import { MoveFlowDialog } from './move-flow-dialog';
import { RenameFlowDialog } from './rename-flow-dialog';

interface FlowActionMenuProps {
  flow: Flow;
  flowVersion: FlowVersion;
  children?: React.ReactNode;
  readonly: boolean;
  onRename: (newName: string) => void;
  onMoveTo: (folderId: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  insideBuilder: boolean;
}

const FlowActionMenu: React.FC<FlowActionMenuProps> = ({
  flow,
  flowVersion,
  children,
  readonly,
  insideBuilder,
  onRename,
  onMoveTo,
  onDuplicate,
  onDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { updateHomePageOperationalViewFlag } =
    userSettingsHooks.useHomePageOperationalView();

  const { mutate: duplicateFlow, isPending: isDuplicatePending } = useMutation({
    mutationFn: async () => {
      const createdFlow = await flowsApi.create({
        displayName: flowVersion.displayName,
        projectId: authenticationSession.getProjectId()!,
      });
      const updatedFlow = await flowsApi.update(createdFlow.id, {
        type: FlowOperationType.IMPORT_FLOW,
        request: {
          displayName: flowVersion.displayName,
          description: flowVersion.description,
          trigger: flowVersion.trigger,
        },
      });
      return updatedFlow;
    },
    onSuccess: (data) => {
      updateHomePageOperationalViewFlag();
      window.open(`/flows/${data.id}`, '_blank', `noopener noreferrer`);
      onDuplicate();
    },
    onError: () => toast(INTERNAL_ERROR_TOAST),
  });

  const { mutate: exportFlow, isPending: isExportPending } = useMutation({
    mutationFn: () => flowsUtils.downloadFlow(flow.id, flowVersion.id),
    onSuccess: () => {
      toast({
        title: t('Success'),
        description: t('Workflow has been exported.'),
        duration: 3000,
      });
    },
    onError: () => toast(INTERNAL_ERROR_TOAST),
  });

  const refetchFolderTree = useRefetchFolderTree();

  return (
    <DropdownMenu modal={true} open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        className="rounded-full p-2 cursor-pointer"
        role="menuitem"
        data-testid="flow-details-panel-actions"
        asChild
      >
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {!insideBuilder && (
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <Link
              type="button"
              to={{
                pathname: `/flows/${flow.id}`,
                search: `?folderId=${flow.folderId}&${SEARCH_PARAMS.viewOnly}=false`,
              }}
            >
              <div className="flex cursor-pointer flex-row gap-2 items-center">
                <Pencil className="h-4 w-4" />
                <span>{t('Edit')}</span>
              </div>
            </Link>
          </DropdownMenuItem>
        )}

        {!readonly && (
          <RenameFlowDialog
            flowId={flow.id}
            onRename={(name) => {
              setIsOpen(false);
              onRename(name);
            }}
            currentName={flowVersion.displayName}
          >
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <div className="flex cursor-pointer flex-row gap-2 items-center">
                <TextCursorInput className="h-4 w-4" />
                <span>{t('Rename')}</span>
              </div>
            </DropdownMenuItem>
          </RenameFlowDialog>
        )}

        <MoveFlowDialog
          flow={flow}
          flowVersion={flowVersion}
          onMoveTo={(folderId) => {
            onMoveTo(folderId);
            setIsOpen(false);
          }}
        >
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <div className="flex cursor-pointer  flex-row gap-2 items-center">
              <CornerUpLeft className="h-4 w-4" />
              <span>{t('Move To')}</span>
            </div>
          </DropdownMenuItem>
        </MoveFlowDialog>

        <DropdownMenuItem onClick={() => duplicateFlow()}>
          <div className="flex cursor-pointer  flex-row gap-2 items-center">
            {isDuplicatePending ? (
              <LoadingSpinner />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span>
              {isDuplicatePending ? t('Duplicating') : t('Duplicate')}
            </span>
          </div>
        </DropdownMenuItem>

        {!readonly && (
          <ImportFlowDialog>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <div className="flex cursor-pointer flex-row gap-2 items-center">
                <Import className="w-4 h-4" />
                {t('Import')}
              </div>
            </DropdownMenuItem>
          </ImportFlowDialog>
        )}
        <DropdownMenuItem onClick={() => exportFlow()}>
          <div className="flex cursor-pointer  flex-row gap-2 items-center">
            {isExportPending ? (
              <LoadingSpinner />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{isExportPending ? t('Exporting') : t('Export')}</span>
          </div>
        </DropdownMenuItem>
        {!readonly && (
          <ConfirmationDeleteDialog
            title={
              <span className="text-primary text-[22px]">
                {t('Delete workflow')}
              </span>
            }
            className="max-w-[700px]"
            message={
              <span className="max-w-[652px] block text-primary text-base font-medium ">
                {t('Are you sure you want to delete "{flowName}"?', {
                  flowName: (
                    <b key={flowVersion.id} className="font-bold break-words">
                      {flowVersion.displayName}
                    </b>
                  ),
                })}
              </span>
            }
            mutationFn={async () => {
              await flowsApi.delete(flow.id);
              await refetchFolderTree();
              onDelete();
            }}
            entityName={t('flow')}
            content={
              <WarningWithIcon
                message={t(
                  'Deleting this workflow will permanently remove all its data and stop any ongoing runs',
                )}
              />
            }
          >
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <div className="flex cursor-pointer  flex-row gap-2 items-center">
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="text-destructive">{t('Delete')}</span>
              </div>
            </DropdownMenuItem>
          </ConfirmationDeleteDialog>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { FlowActionMenu };
