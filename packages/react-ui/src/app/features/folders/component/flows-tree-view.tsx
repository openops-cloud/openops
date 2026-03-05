import {
  cn,
  CollapsibleFolderTreeProps,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FileAddons,
  FOLDER_ID_PARAM_NAME,
  FolderAddons,
  FolderItem,
  FolderTree,
  getPathToRoot,
  ScrollArea,
  TooltipWrapper,
  WarningWithIcon,
} from '@openops/components/ui';
import { Permission, UNCATEGORIZED_FOLDER_ID } from '@openops/shared';
import { useEffect, useMemo, useState } from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import { ConfirmationDeleteDialog } from '@/app/common/components/delete-dialog';
import { PermissionGuard } from '@/app/common/components/permission-guard';
import { useAuthorization } from '@/app/common/hooks/authorization-hooks';
import {
  flowsHooks,
  FlowsSearchState,
} from '@/app/features/flows/lib/flows-hooks';
import { foldersHooks } from '@/app/features/folders/lib/folders-hooks';
import { useAppStore } from '@/app/store/app-store';
import { t } from 'i18next';
import {
  EllipsisVertical,
  Folder as FolderIcon,
  FolderOutput as FolderOutputIcon,
  Pencil as PencilIcon,
  Trash2 as TrashIcon,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import { useRefetchFolderTree } from '../hooks/refetch-folder-tree';
import { useUpdateSearchParams } from '../hooks/update-search-params';
import { useFlowParentFolder } from '../hooks/use-flow-parent-folder';
import { foldersApi } from '../lib/folders-api';
import {
  getAllFolderIds,
  getFilteredFolders,
  getFlowLink,
} from '../lib/folders-utils';
import { CreateSubfolderDialog } from './create-subfolder-dialog';
import { LoadingSkeleton } from './loading-skeleton';
import { MoveSubfolderDialog } from './move-subfolder-dialog';
import { RenameFolderDialog } from './rename-folder-dialog';

const FolderAddonContent = ({
  item,
  expandSubfolder,
}: {
  item: FolderItem;
  expandSubfolder: (folderItem?: FolderItem) => void;
}) => {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [childFolderNames, setChildFolderNames] = useState<string[]>([]);
  const [childFlowNames, setChildFlowNames] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setChildFlowNames(
      item.children
        ?.filter((child) => child.type === 'item')
        .map((child) => child.displayName)
        .sort() ?? [],
    );

    setChildFolderNames(
      item.children
        ?.filter((child) => child.type === 'folder')
        .map((child) => child.displayName)
        .sort() ?? [],
    );
  }, [item]);

  const { mutate: createFlow } = flowsHooks.useCreateFlow(navigate);

  const refetchFolderTree = useRefetchFolderTree();

  const onDeleteFolder = async (folderId: string) => {
    await foldersApi.delete(folderId);
    await refetchFolderTree();

    navigate('/flows');
  };

  const onCreateSubfolder = async () => {
    await refetchFolderTree();
    expandSubfolder(item);
  };

  const onCreateFlow = async () => {
    createFlow(item.id);
  };

  const isUncategorizedFolder = item.id === UNCATEGORIZED_FOLDER_ID;

  return (
    <DropdownMenu onOpenChange={setIsActionMenuOpen} modal={true}>
      <TooltipWrapper tooltipText={t('More actions')} tooltipPlacement="top">
        <DropdownMenuTrigger
          asChild
          className={cn('invisible group-hover:visible cursor-pointer', {
            visible: isActionMenuOpen,
          })}
        >
          <EllipsisVertical
            className="h-4 w-4"
            role="button"
            data-testid="more-actions"
          />
        </DropdownMenuTrigger>
      </TooltipWrapper>
      <DropdownMenuContent>
        <PermissionGuard
          permission={Permission.WRITE_FLOW}
          tooltipClassName="flex"
        >
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              onCreateFlow();
            }}
          >
            <div className="flex flex-row gap-2 items-center">
              <WorkflowIcon className="h-4 w-4" data-testid="add-flow" />
              <span>{t('New workflow')}</span>
            </div>
          </DropdownMenuItem>
        </PermissionGuard>
        {!isUncategorizedFolder && (
          <>
            <CreateSubfolderDialog
              folderId={item.id}
              onCreate={onCreateSubfolder}
            >
              <PermissionGuard
                permission={Permission.WRITE_FOLDER}
                tooltipClassName="flex"
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <div className="flex flex-row gap-2 items-center">
                    <FolderIcon className="h-4 w-4" />
                    <span>{t('New sub-folder')}</span>
                  </div>
                </DropdownMenuItem>
              </PermissionGuard>
            </CreateSubfolderDialog>
            <RenameFolderDialog
              folderId={item.id}
              name={item.displayName}
              onRename={refetchFolderTree}
            >
              <PermissionGuard
                permission={Permission.WRITE_FOLDER}
                tooltipClassName="flex"
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <div className="flex flex-row gap-2 items-center">
                    <PencilIcon className="h-4 w-4" />
                    <span>{t('Rename')}</span>
                  </div>
                </DropdownMenuItem>
              </PermissionGuard>
            </RenameFolderDialog>
            <MoveSubfolderDialog folder={item}>
              <PermissionGuard
                permission={Permission.WRITE_FOLDER}
                tooltipClassName="flex"
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <div className="flex cursor-pointer  flex-row gap-2 items-center">
                    <FolderOutputIcon className="h-4 w-4" />
                    <span>{t('Move To')}</span>
                  </div>
                </DropdownMenuItem>
              </PermissionGuard>
            </MoveSubfolderDialog>
            <ConfirmationDeleteDialog
              title={
                <span className="text-primary-300 dark:text-primary text-[22px]">
                  {t('Delete folder')}
                </span>
              }
              className="max-w-[700px]"
              message={
                <span className="max-w-[652px] block text-primary-300 dark:text-primary text-base font-medium">
                  {t('Are you sure you want to delete "{flowName}"?', {
                    flowName: (
                      <b key={item.id} className="font-bold break-words">
                        {item.displayName}
                      </b>
                    ),
                  })}
                </span>
              }
              content={
                <>
                  <ScrollArea>
                    <div className="block max-h-[300px] pr-2 text-primary-300 dark:text-primary text-base font-medium">
                      {!!childFolderNames.length && (
                        <ItemList
                          items={childFolderNames}
                          title={t('It contains {n} subfolder(s):', {
                            n: childFolderNames.length,
                          })}
                        ></ItemList>
                      )}
                      {!!childFlowNames.length && (
                        <ItemList
                          items={childFlowNames}
                          title={t(
                            childFolderNames.length
                              ? 'And {n} workflow(s):'
                              : 'It contains {n} workflows(s):',
                            {
                              n: childFlowNames.length,
                            },
                          )}
                        ></ItemList>
                      )}
                    </div>
                  </ScrollArea>
                  {(!!childFolderNames.length || !!childFlowNames.length) && (
                    <WarningWithIcon
                      message={t(
                        'Deleting this folder will uncategorize its workflows and any sub-folders will be deleted',
                      )}
                      className="mt-4"
                    />
                  )}
                </>
              }
              mutationFn={() => onDeleteFolder(item.id)}
              entityName={item.displayName}
            >
              <PermissionGuard
                permission={Permission.DELETE_FOLDER}
                tooltipClassName="flex"
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <div className="flex flex-row gap-2 items-center">
                    <TrashIcon className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">{t('Delete')}</span>
                  </div>
                </DropdownMenuItem>
              </PermissionGuard>
            </ConfirmationDeleteDialog>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type FolderTreeWrapperProps = {
  folderItems: FolderItem[];
  collapseDisabled?: boolean;
} & Omit<CollapsibleFolderTreeProps, 'onFolderClick' | 'onItemClick'>;

const FolderTreeWrapper = ({
  folderItems,
  ...props
}: FolderTreeWrapperProps) => {
  const { flowId } = useParams();

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const updateSearchParams = useUpdateSearchParams();
  const { checkAccess } = useAuthorization();
  const canWriteFlow = checkAccess(Permission.WRITE_FLOW);

  const expandSubfolder = (folderItem?: FolderItem) => {
    if (
      !folderItem ||
      !folderItem.children ||
      folderItem.children.length === 0
    ) {
      return;
    }

    const expandedFoldersIds = getPathToRoot(folderItem.id, folderItems);
    props.setExpandedFolders(new Set(expandedFoldersIds));
  };

  if (!folderItems) {
    return null;
  }

  return (
    <FolderTree
      folderItems={folderItems}
      onFolderClick={(item) => {
        const selectedFolderId = searchParams.get(FOLDER_ID_PARAM_NAME);
        const toUpdateSelectFolderId =
          selectedFolderId === item.id ? item.parentFolderId : item.id;
        updateSearchParams(toUpdateSelectFolderId, true);
      }}
      onItemClick={(item) => {
        const isSelectedFlow = item.id === flowId;
        const flowLink = getFlowLink(
          item.id,
          true,
          isSelectedFlow ? location.search : undefined,
        );
        navigate(flowLink);
      }}
      selectedItemId={flowId}
      fileAddons={(item) => {
        return (
          <FileAddons
            item={item}
            isSelected={item.id === flowId}
            readonly={!canWriteFlow}
            onViewClick={(item) => {
              navigate(getFlowLink(item.id, true));
            }}
            onEditClick={(item) => navigate(getFlowLink(item.id, false))}
          />
        );
      }}
      folderAddons={(item) => (
        <FolderAddons
          item={item}
          moreActions={
            <FolderAddonContent expandSubfolder={expandSubfolder} item={item} />
          }
        />
      )}
      {...props}
    />
  );
};

export const FlowsTreeView = ({
  flowsSearchState,
}: {
  flowsSearchState: FlowsSearchState;
}) => {
  const { folderItems, isLoading } = foldersHooks.useFolderItems();
  const selectedFlowParentFolder = useFlowParentFolder(folderItems);
  const { expandedFlowFolderIds, setExpandedFolderIds } = useAppStore(
    (state) => ({
      expandedFlowFolderIds: state.expandedFlowFolderIds,
      setExpandedFolderIds: state.setExpandedFlowFolderIds,
    }),
  );
  const [searchParams] = useSearchParams();

  const selectedFolderId =
    searchParams.get(FOLDER_ID_PARAM_NAME) || selectedFlowParentFolder?.id;

  useEffect(() => {
    if (selectedFolderId && folderItems) {
      setExpandedFolderIds(
        new Set([
          ...getPathToRoot(selectedFolderId, folderItems),
          ...expandedFlowFolderIds,
        ]),
      );
    }
  }, [selectedFolderId, folderItems]);

  const filteredFoldersItems = useMemo(() => {
    if (!folderItems) {
      return [];
    }
    return getFilteredFolders(folderItems, flowsSearchState);
  }, [flowsSearchState, folderItems]);

  const currentExpandedFolderIds = flowsSearchState.searchTerm
    ? getAllFolderIds(filteredFoldersItems)
    : expandedFlowFolderIds;

  if (isLoading || flowsSearchState.loading) {
    return <LoadingSkeleton />;
  }
  return (
    <FolderTreeWrapper
      folderItems={filteredFoldersItems}
      expandedFolders={currentExpandedFolderIds}
      setExpandedFolders={setExpandedFolderIds}
      collapseDisabled={flowsSearchState.searchTerm !== ''}
    />
  );
};

const ItemList = ({ title, items }: { title: string; items: string[] }) => (
  <>
    <span>{title}</span>
    <ul className="ml-7 list-disc break-words">
      {items.map((displayName, i) => (
        <li key={i}>{displayName}</li>
      ))}
    </ul>
  </>
);
