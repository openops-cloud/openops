import { BuilderHeaderActionBar } from '@/app/features/builder/builder-header/builder-header-action-bar';
import { SideMenuCollapsed } from '@/app/features/builder/builder-header/side-menu-collapsed';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { LeftSideBarType } from '../builder-types';

import { WorkflowOverview } from '@/app/features/builder/builder-header/workflow-overview/workflow-overview';
import { BuilderPublishButton } from './builder-publish-button';
import BuilderViewOnlyWidget from './builder-view-only-widget';
import { UndoRedoActionBar } from './undo-redo-action-bar';

export const BuilderHeader = () => {
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
    <div className="w-full absolute z-10 top-[25px] px-4 flex gap-6 justify-between @container">
      <div className="flex items-center gap-2 contain-layout">
        <SideMenuCollapsed />
        {(!readonly || flowVersion.description) && <WorkflowOverview />}
        <BuilderHeaderActionBar
          leftSidebar={leftSidebar}
          handleSidebarButtonClick={handleSidebarButtonClick}
        />
      </div>
      <div className="flex items-center gap-2">
        {readonly && <BuilderViewOnlyWidget></BuilderViewOnlyWidget>}
        {!readonly && <UndoRedoActionBar />}
        <BuilderPublishButton></BuilderPublishButton>
      </div>
    </div>
  );
};
