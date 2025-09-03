import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { LeftSideBarType } from '@/app/features/builder/builder-types';
import { FolderFilterList } from '@/app/features/folders/component/folder-filter-list';
import { useMenuLinks } from '@/app/features/navigation/lib/menu-links-hook';
import { FlowSideMenuHeader } from '@/app/features/navigation/side-menu/flow/flow-side-menu-header';
import { SideMenuFooter } from '@/app/features/navigation/side-menu/side-menu-footer';
import {
  ScrollArea,
  SideMenu,
  SideMenuNavigation,
} from '@openops/components/ui';

export function FlowSideMenu() {
  const leftSidebar = useBuilderStateContext((state) => state.leftSidebar);
  const menuLinks = useMenuLinks();

  return (
    <SideMenu
      MenuHeader={<FlowSideMenuHeader />}
      MenuFooter={
        <SideMenuFooter isMinimized={leftSidebar === LeftSideBarType.NONE} />
      }
    >
      <SideMenuNavigation links={menuLinks} isMinimized={false} />
      <ScrollArea className="border-t">
        <FolderFilterList />
      </ScrollArea>
    </SideMenu>
  );
}
