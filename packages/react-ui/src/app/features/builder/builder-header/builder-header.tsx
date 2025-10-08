import { BuilderHeaderActionBar } from '@/app/features/builder/builder-header/builder-header-action-bar';
import { SideMenuCollapsed } from '@/app/features/builder/builder-header/side-menu-collapsed';
import {
  useBuilderStateContext,
  useSwitchToDraft,
} from '@/app/features/builder/builder-hooks';
import { LeftSideBarType } from '../builder-types';

import { WorkflowOverview } from '@/app/features/builder/builder-header/workflow-overview/workflow-overview';
import { RunDetailsBar } from '@/app/features/flow-runs/components/run-details-bar';
import { cn } from '@openops/components/ui';
import { WebsocketClientEvent } from '@openops/shared';
import { useSocket } from '@/app/common/providers/socket-provider';
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

  return (
    <div
      className={cn(
        'w-full absolute z-10 top-[25px] px-4 flex gap-6 justify-between @container',
        className,
      )}
    >
      <div className="flex items-center gap-2 contain-layout">
        <SideMenuCollapsed>
          <DetailsPanel />
        </SideMenuCollapsed>
        {(!readonly || flowVersion.description) && <WorkflowOverview />}
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
      </div>
    </div>
  );
};
