import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
  ContextMenuType,
} from '@openops/components/ui';

import { CanvasContextMenuContent } from './canvas-context-menu-content';

export type CanvasContextMenuProps = {
  contextMenuType: ContextMenuType;
  children?: React.ReactNode;
};

const CanvasContextMenuWrapper = ({
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

CanvasContextMenuWrapper.displayName = 'CanvasContextMenuWrapper';
export { CanvasContextMenuWrapper };
