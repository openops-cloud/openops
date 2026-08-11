import { MutationFunction } from '@tanstack/react-query';

import {
  Flow,
  FlowOperationType,
  FlowVersion,
  PopulatedFlow,
  UNCATEGORIZED_FOLDER_ID,
} from '@openops/shared';

import {
  MoveToFolderDialog,
  MoveToFolderDialogProps,
  MoveToFolderFormSchema,
} from '@/app/features/folders/component/move-to-folder-dialog';
import { flowsApi } from '../lib/flows-api';

interface MoveFlowDialogProps extends Pick<
  MoveToFolderDialogProps<PopulatedFlow>,
  'children' | 'onMoveTo'
> {
  flow: Flow;
  flowVersion: FlowVersion;
}

const MoveFlowDialog = ({
  flow,
  flowVersion,
  children,
  ...props
}: MoveFlowDialogProps) => {
  const apiMutateFn: MutationFunction<
    PopulatedFlow,
    MoveToFolderFormSchema
  > = async (data) => {
    return await flowsApi.update(flow.id, {
      type: FlowOperationType.CHANGE_FOLDER,
      request: {
        folderId: data.folder,
      },
    });
  };

  return (
    <MoveToFolderDialog
      apiMutateFn={apiMutateFn}
      displayName={flowVersion.displayName}
      {...props}
      excludeFolderIds={getExcludedFolderIds(flow)}
    >
      {children}
    </MoveToFolderDialog>
  );
};

const getExcludedFolderIds = (flow: Flow) => {
  const excludeFolderIds = [UNCATEGORIZED_FOLDER_ID];
  if (flow.folderId) {
    excludeFolderIds.push(flow.folderId);
  }
  return excludeFolderIds;
};

export { MoveFlowDialog };
