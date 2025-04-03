import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
  ContextMenuType,
} from '@openops/components/ui';

import { Action } from '@openops/shared';
import { useBuilderStateContext } from '../../builder-hooks';
import { CanvasContextMenuContent } from './canvas-context-menu-content';

export type CanvasContextMenuProps = {
  contextMenuType: ContextMenuType;
  actionToPaste: Action | null;
  children?: React.ReactNode;
};

const CanvasContextMenuWrapper = ({
  children,
  actionToPaste,
  contextMenuType,
}: CanvasContextMenuProps) => {
  const readonly = useBuilderStateContext((state) => state.readonly);

  if (readonly) {
    return children;
  }

  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <CanvasContextMenuContent
          contextMenuType={contextMenuType}
          actionToPaste={actionToPaste}
        ></CanvasContextMenuContent>
      </ContextMenuContent>
    </ContextMenu>
  );
};

CanvasContextMenuWrapper.displayName = 'CanvasContextMenuWrapper';
export { CanvasContextMenuWrapper };
