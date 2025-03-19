import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from '@openops/components/ui';

import { CanvasContextMenuContent } from './canvas-context-menu-content';
import { ContextMenuType } from './types';

export type CanvasContextMenuProps = {
  contextMenuType: ContextMenuType;
  children?: React.ReactNode;
};

export const CanvasContextMenu = ({
  children,
  contextMenuType,
}: CanvasContextMenuProps) => {
  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <CanvasContextMenuContent
          contextMenuType={contextMenuType}
        ></CanvasContextMenuContent>
      </ContextMenuContent>
    </ContextMenu>
  );
};
