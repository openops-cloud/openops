import { BuilderHeaderActionBar } from '@/app/features/builder/builder-header/builder-header-action-bar';
import { SideMenuCollapsed } from '@/app/features/builder/builder-header/side-menu-collapsed';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { LeftSideBarType } from '../builder-types';

import { ExpandSideMenu } from '@/app/features/builder/builder-header/expand-side-menu';
import { WorkflowOverview } from '@/app/features/builder/builder-header/workflow-overview/workflow-overview';
import { useAppStore } from '@/app/store/app-store';
import { FC } from 'react';
import BuilderViewOnlyWidget from './builder-view-only-widget';
import { UndoRedoActionBar } from './undo-redo-action-bar';

type BuilderHeaderProps = {
  DetailsPanel: FC;
  PublishButton: FC;
};

export const BuilderHeader = ({
  DetailsPanel,
  PublishButton,
}: BuilderHeaderProps) => {
  const [leftSidebar, setLeftSidebar, readonly, flowVersion] =
    useBuilderStateContext((state) => [
      state.leftSidebar,
      state.setLeftSidebar,
      state.readonly,
      state.flowVersion,
    ]);

  const { setIsSidebarMinimized } = useAppStore((state) => ({
    setIsSidebarMinimized: state.setIsSidebarMinimized,
  }));

  const handleSidebarButtonClick = (sidebarType: LeftSideBarType) => {
    if (leftSidebar === sidebarType) {
      setLeftSidebar(LeftSideBarType.NONE);
      setIsSidebarMinimized(true);
    } else {
      setLeftSidebar(sidebarType);
      setIsSidebarMinimized(false);
    }
  };

  return (
    <div className="w-full absolute z-10 top-[25px] px-4 flex gap-6 justify-between @container">
      <div className="flex items-center gap-2 contain-layout">
        <ExpandSideMenu
          isSideMenuCollapsed={leftSidebar !== LeftSideBarType.MENU}
          handleCollasedClick={() => {
            handleSidebarButtonClick(LeftSideBarType.MENU);
          }}
        />
        <SideMenuCollapsed>
          <DetailsPanel />
        </SideMenuCollapsed>
        {(!readonly || flowVersion.description) && <WorkflowOverview />}
        <BuilderHeaderActionBar
          leftSidebar={leftSidebar}
          handleSidebarButtonClick={handleSidebarButtonClick}
        />
      </div>
      <div className="flex items-center gap-2">
        {readonly && <BuilderViewOnlyWidget></BuilderViewOnlyWidget>}
        {!readonly && <UndoRedoActionBar />}
        <PublishButton />
      </div>
    </div>
  );
};
