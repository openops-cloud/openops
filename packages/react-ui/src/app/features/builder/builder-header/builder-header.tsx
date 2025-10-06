import { BuilderHeaderActionBar } from '@/app/features/builder/builder-header/builder-header-action-bar';
import { SideMenuCollapsed } from '@/app/features/builder/builder-header/side-menu-collapsed';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { LeftSideBarType } from '../builder-types';

import { BuilderExitEditModeButton } from '@/app/features/builder/builder-header/builder-exit-edit-mode-button';
import { WorkflowOverview } from '@/app/features/builder/builder-header/workflow-overview/workflow-overview';
import { cn } from '@openops/components/ui';
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
  const [leftSidebar, setLeftSidebar, readonly, flowVersion] =
    useBuilderStateContext((state) => [
      state.leftSidebar,
      state.setLeftSidebar,
      state.readonly,
      state.flowVersion,
    ]);

  const handleSidebarButtonClick = (sidebarType: LeftSideBarType) => {
    if (leftSidebar === sidebarType) {
      setLeftSidebar(LeftSideBarType.NONE);
    } else {
      setLeftSidebar(sidebarType);
    }
  };

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
      <div className="flex items-center gap-2 contain-layout">
        {readonly && <BuilderViewOnlyWidget></BuilderViewOnlyWidget>}
        {!readonly && <UndoRedoActionBar />}
        <PublishButton />
        {!readonly && <BuilderExitEditModeButton />}
      </div>
    </div>
  );
};
