import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  LoadingSpinner,
  RunsIcon,
  TooltipWrapper,
  VerticalDivider,
  WarningWithIcon,
} from '@openops/components/ui';
import { t } from 'i18next';
import {
  BookOpen,
  Copy,
  CornerUpLeft,
  Download,
  EllipsisVertical,
  History,
  Import,
  Pencil,
  TextCursorInput,
  Trash2,
  Workflow,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { ConfirmationDeleteDialog } from '@/app/common/components/delete-dialog';
import { SEARCH_PARAMS } from '@/app/constants/search-params';
import { LeftSideBarType } from '@/app/features/builder/builder-hooks';
import { ImportFlowDialog } from '@/app/features/flows/components/import-flow-dialog';
import { MoveFlowDialog } from '@/app/features/flows/components/move-flow-dialog';
import { RenameFlowDialog } from '@/app/features/flows/components/rename-flow-dialog';
import { flowsApi } from '@/app/features/flows/lib/flows-api';

type BuilderHeaderActionBarProps = {
  handleSidebarButtonClick: (type: LeftSideBarType) => void;
  leftSidebar: LeftSideBarType;
};

const BuilderHeaderActionBar = ({
  leftSidebar,
  handleSidebarButtonClick,
}: BuilderHeaderActionBarProps) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isInRunsPage = useMemo(
    () => location.pathname.startsWith('/runs'),
    [location.pathname],
  );

  return (
    <DropdownMenu modal={true} open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger>
        <div className="bg-background shadow-editor flex items-center justify-center rounded-lg z-50 p-1 h-[42px]">
          <TooltipWrapper tooltipText={t('Actions')} tooltipPlacement="bottom">
            <Button
              variant={isOpen ? 'ghostActive' : 'ghost'}
              className="p-0 min-w-[34px]"
              aria-label="Actions"
            >
              <EllipsisVertical size={24} />
            </Button>
          </TooltipWrapper>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="px-2 py-[6px] flex flex-col gap-2"
        side="bottom"
        align="start"
      >
        <DropdownMenuItem
          onSelect={() => {
            handleSidebarButtonClick(LeftSideBarType.TREE_VIEW);
          }}
          className={cn('flex items-center gap-2', {
            'bg-secondary': leftSidebar === LeftSideBarType.TREE_VIEW,
          })}
        >
          <Workflow className="w-6 h-6" />
          {t('Tree view')}
        </DropdownMenuItem>

        {!isInRunsPage && (
          <DropdownMenuItem
            onSelect={() => handleSidebarButtonClick(LeftSideBarType.VERSIONS)}
            className={cn('flex items-center gap-2', {
              'bg-secondary': leftSidebar === LeftSideBarType.VERSIONS,
            })}
          >
            <Workflow className="w-6 h-6" />
            {t('Versions History')}
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          onSelect={() => handleSidebarButtonClick(LeftSideBarType.RUNS)}
          className={cn('flex items-center gap-2', {
            'bg-secondary': leftSidebar === LeftSideBarType.RUNS,
          })}
        >
          <RunsIcon className="w-6 h-6" />
          {t('Run Logs')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

BuilderHeaderActionBar.displayName = 'BuilderHeaderActionBar';
export { BuilderHeaderActionBar };
