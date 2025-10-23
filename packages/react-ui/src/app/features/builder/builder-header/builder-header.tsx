import { useSocket } from '@/app/common/providers/socket-provider';
import { BuilderHeaderActionBar } from '@/app/features/builder/builder-header/builder-header-action-bar';
import { SideMenuCollapsed } from '@/app/features/builder/builder-header/side-menu-collapsed';
import {
  useBuilderStateContext,
  useSwitchToDraft,
} from '@/app/features/builder/builder-hooks';
import { LeftSideBarType } from '../builder-types';

import { BuilderExitEditModeButton } from '@/app/features/builder/builder-header/builder-exit-edit-mode-button';
import { WorkflowOverview } from '@/app/features/builder/builder-header/workflow-overview/workflow-overview';
import { RunDetailsBar } from '@/app/features/flow-runs/components/run-details-bar';
import { cn } from '@openops/components/ui';
import { WebsocketClientEvent } from '@openops/shared';
import { FC } from 'react';
import BuilderViewOnlyWidget from './builder-view-only-widget';
import { UndoRedoActionBar } from './undo-redo-action-bar';

type BuilderHeaderProps = {
  DetailsPanel: FC;
  PublishButton: FC;
  className?: string;
};

export const BuilderHeader = ({
  DetailsPanel,
  PublishButton,
  className,
}: BuilderHeaderProps) => {
  const [leftSidebar, setLeftSidebar, readonly, flowVersion, run, canExitRun] =
    useBuilderStateContext((state) => [
      state.leftSidebar,
      state.setLeftSidebar,
      state.readonly,
      state.flowVersion,
      state.run,
      state.canExitRun,
    ]);

  const handleSidebarButtonClick = (sidebarType: LeftSideBarType) => {
    if (leftSidebar === sidebarType) {
      setLeftSidebar(LeftSideBarType.NONE);
    } else {
      setLeftSidebar(sidebarType);
    }
  };

  const { switchToDraft, isSwitchingToDraftPending } = useSwitchToDraft();
  const socket = useSocket();

  const showOverview = !readonly || flowVersion.description;

  return (
    <div
      className={cn(
        'w-full absolute z-10 top-[25px] px-2 flex gap-2 justify-between items-start @container',
        className,
      )}
    >
      <div
        className={cn('flex items-center gap-2 contain-layout', {
          'min-w-[202px]': showOverview,
          'min-w-[150px]': !showOverview,
        })}
      >
        <SideMenuCollapsed>
          <DetailsPanel />
        </SideMenuCollapsed>
        {showOverview && <WorkflowOverview />}
        <BuilderHeaderActionBar
          leftSidebar={leftSidebar}
          handleSidebarButtonClick={handleSidebarButtonClick}
        />
      </div>
      <RunDetailsBar
        canExitRun={canExitRun}
        run={run}
        isLoading={isSwitchingToDraftPending}
        exitRun={() => {
          socket.removeAllListeners(WebsocketClientEvent.FLOW_RUN_PROGRESS);
          switchToDraft();
        }}
      />
      <div className="flex items-center gap-2 contain-layout">
        {readonly && <BuilderViewOnlyWidget></BuilderViewOnlyWidget>}
        {!readonly && <UndoRedoActionBar />}
        <PublishButton />
        {!readonly && <BuilderExitEditModeButton />}
      </div>
    </div>
  );
};
