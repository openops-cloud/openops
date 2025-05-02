import {
  AvatarLetter,
  Button,
  CardListItem,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  INTERNAL_ERROR_TOAST,
  LoadingSpinner,
  PermissionNeededTooltip,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openops/components/ui';
import {
  FlowOperationType,
  FlowVersion,
  FlowVersionMetadata,
  FlowVersionState,
  Permission,
  PopulatedFlow,
} from '@openops/shared';
import { DotsVerticalIcon } from '@radix-ui/react-icons';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { Eye, EyeIcon, Pencil } from 'lucide-react';
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAuthorization } from '@/app/common/hooks/authorization-hooks';
import { SEARCH_PARAMS } from '@/app/constants/search-params';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { LeftSideBarType } from '@/app/features/builder/builder-types';
import { FlowVersionStateDot } from '@/app/features/flows/components/flow-version-state-dot';
import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { formatUtils } from '@/app/lib/utils';

type UseAsDraftOptionProps = {
  versionNumber: number;
  onConfirm: () => void;
};
const UseAsDraftDropdownMenuOption = ({
  versionNumber,
  onConfirm,
}: UseAsDraftOptionProps) => {
  const { checkAccess } = useAuthorization();
  const userHasPermissionToWriteFlow = checkAccess(Permission.WRITE_FLOW);

  return (
    <Dialog>
      <DialogTrigger
        disabled={!userHasPermissionToWriteFlow}
        className="w-full"
      >
        <PermissionNeededTooltip hasPermission={userHasPermissionToWriteFlow}>
          <DropdownMenuItem
            className="w-full"
            onSelect={(e) => {
              e.preventDefault();
            }}
            disabled={!userHasPermissionToWriteFlow}
          >
            <Pencil className="mr-2 h-4 w-4" />
            <span>{t('Use as Draft')}</span>
          </DropdownMenuItem>
        </PermissionNeededTooltip>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Are you sure?')}</DialogTitle>
          <DialogDescription>
            {t('Your current draft version will be overwritten with')}{' '}
            <span className="font-semibold">
              {t('version #')}
              {versionNumber}
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="justify-end">
          <DialogClose asChild>
            <Button variant={'outline'}>{t('Cancel')}</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={() => onConfirm()}>{t('Confirm')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
UseAsDraftDropdownMenuOption.displayName = 'UseAsDraftDropdownMenuOption';

type FlowVersionDetailsCardProps = {
  flowVersion: FlowVersionMetadata;
  selected: boolean;
  published: boolean;
  flowVersionNumber: number;
};
const FlowVersionDetailsCard = React.memo(
  ({
    flowVersion,
    flowVersionNumber,
    selected,
    published,
  }: FlowVersionDetailsCardProps) => {
    const [setBuilderVersion, setLeftSidebar, setReadonly] =
      useBuilderStateContext((state) => [
        state.setVersion,
        state.setLeftSidebar,
        state.setReadOnly,
      ]);
    const [dropdownMenuOpen, setDropdownMenuOpen] = useState(false);
    const [, setSearchParams] = useSearchParams();
    const { mutate, isPending } = useMutation<
      FlowVersion,
      Error,
      FlowVersionMetadata
    >({
      mutationFn: async (flowVersion) => {
        const result = await flowsApi.get(flowVersion.flowId, {
          versionId: flowVersion.id,
        });
        return result.version;
      },
      onSuccess: (populatedFlowVersion) => {
        setBuilderVersion(populatedFlowVersion);
        setReadonly(populatedFlowVersion.state === FlowVersionState.LOCKED);
        setSearchParams(
          (params) => {
            params.set(
              SEARCH_PARAMS.viewOnly,
              String(populatedFlowVersion.state === FlowVersionState.LOCKED),
            );
            return params;
          },
          { replace: true },
        );
      },
      onError: (error) => {
        toast(INTERNAL_ERROR_TOAST);
        console.error(error);
      },
    });

    const { mutate: mutateVersionAsDraft, isPending: isDraftPending } =
      useMutation<PopulatedFlow, Error, FlowVersionMetadata>({
        mutationFn: async (flowVersion) => {
          const result = await flowsApi.update(flowVersion.flowId, {
            type: FlowOperationType.USE_AS_DRAFT,
            request: {
              versionId: flowVersion.id,
            },
          });
          return result;
        },
        onSuccess: (populatedFlowVersion) => {
          setBuilderVersion(populatedFlowVersion.version);
          setLeftSidebar(LeftSideBarType.NONE);
          setReadonly(false);
          setSearchParams(
            (params) => {
              params.set(SEARCH_PARAMS.viewOnly, 'false');
              return params;
            },
            {
              replace: true,
            },
          );
        },
        onError: (error) => {
          toast(INTERNAL_ERROR_TOAST);
          console.error(error);
        },
      });

    const handleOverwriteDraft = () => {
      mutateVersionAsDraft(flowVersion);
      setDropdownMenuOpen(false);
    };

    return (
      <CardListItem interactive={false} className="gap-[10px]">
        {flowVersion.updatedByUser && (
          <AvatarLetter
            name={
              flowVersion.updatedByUser.firstName +
              ' ' +
              flowVersion.updatedByUser.lastName
            }
            email={flowVersion.updatedByUser.email}
          />
        )}
        <div className="grid gap-2">
          <p className="text-sm font-medium leading-none select-none pointer-events-none">
            {formatUtils.formatDate(new Date(flowVersion.created))}
          </p>
          <p className="flex gap-1 text-xs text-muted-foreground">
            {t('Version')} {flowVersionNumber}
          </p>
        </div>
        <div className="flex-grow"></div>
        <div className="flex font-medium gap-2 justy-center items-center">
          {selected && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="size-8 flex justify-center items-center">
                  <EyeIcon className="w-5 h-5 "></EyeIcon>
                </div>
              </TooltipTrigger>
              <TooltipContent>{t('Viewing')}</TooltipContent>
            </Tooltip>
          )}

          {flowVersion.state === FlowVersionState.DRAFT && (
            <FlowVersionStateDot
              className="size-8"
              state={flowVersion.state}
            ></FlowVersionStateDot>
          )}

          {published && flowVersion.state === FlowVersionState.LOCKED && (
            <FlowVersionStateDot
              className="size-8"
              state={flowVersion.state}
            ></FlowVersionStateDot>
          )}

          <DropdownMenu
            onOpenChange={(open) => setDropdownMenuOpen(open)}
            open={dropdownMenuOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                disabled={isPending || isDraftPending}
                size={'icon'}
                className="size-8 @[350px]:size-10"
              >
                {(isPending || isDraftPending) && (
                  <LoadingSpinner className="w-5 h-5" />
                )}
                {!isPending && !isDraftPending && (
                  <DotsVerticalIcon className="w-5 h-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40">
              <DropdownMenuItem
                onClick={() => mutate(flowVersion)}
                className="w-full"
              >
                <Eye className="mr-2 h-4 w-4" />
                <span>{t('View')}</span>
              </DropdownMenuItem>
              {flowVersion.state !== FlowVersionState.DRAFT && (
                <UseAsDraftDropdownMenuOption
                  versionNumber={flowVersionNumber}
                  onConfirm={handleOverwriteDraft}
                ></UseAsDraftDropdownMenuOption>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardListItem>
    );
  },
);

FlowVersionDetailsCard.displayName = 'FlowVersionDetailsCard';
export { FlowVersionDetailsCard };
