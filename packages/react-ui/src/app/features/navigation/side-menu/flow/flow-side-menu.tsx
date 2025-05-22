import {
  ScrollArea,
  SideMenu,
  SideMenuNavigation,
} from '@openops/components/ui';

import { MENU_LINKS } from '@/app/constants/menu-links';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { LeftSideBarType } from '@/app/features/builder/builder-types';
import { FolderFilterList } from '@/app/features/folders/component/folder-filter-list';
import { FlowSideMenuHeader } from '@/app/features/navigation/side-menu/flow/flow-side-menu-header';
import { SideMenuFooter } from '@/app/features/navigation/side-menu/side-menu-footer';

export function FlowSideMenu() {
  const leftSidebar = useBuilderStateContext((state) => state.leftSidebar);

  return (
    <SideMenu
      MenuHeader={<FlowSideMenuHeader />}
      MenuFooter={
        <SideMenuFooter isMinimized={leftSidebar === LeftSideBarType.NONE} />
      }
    >
      <SideMenuNavigation links={MENU_LINKS} isMinimized={false} />
      <ScrollArea className="border-t">
        <FolderFilterList />
      </ScrollArea>
    </SideMenu>
  );
}
