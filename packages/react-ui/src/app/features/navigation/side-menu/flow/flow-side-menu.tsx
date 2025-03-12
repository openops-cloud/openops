import {
  ScrollArea,
  SideMenu,
  SideMenuNavigation,
} from '@openops/components/ui';

import { MENU_LINKS } from '@/app/constants/menu-links';
import { FolderFilterList } from '@/app/features/folders/component/folder-filter-list';
import { FlowSideMenuHeader } from '@/app/features/navigation/side-menu/flow/flow-side-menu-header';
import { SideMenuFooter } from '@/app/features/navigation/side-menu/side-menu-footer';

export function FlowSideMenu() {
  return (
    <SideMenu MenuHeader={FlowSideMenuHeader} MenuFooter={SideMenuFooter}>
      <SideMenuNavigation links={MENU_LINKS} isMinimized={false} />
      <ScrollArea className="border-t">
        <FolderFilterList />
      </ScrollArea>
    </SideMenu>
  );
}
