import { EyeIcon, Pencil } from 'lucide-react';
import { TooltipWrapper } from '../tooltip-wrapper';
import { FolderItem } from './types';

type Props = {
  item: FolderItem;
  isSelected: boolean;
  readonly: boolean;
  onViewClick: (item: FolderItem) => void;
  onEditClick: (item: FolderItem) => void;
};

const FileAddons = ({
  item,
  isSelected,
  readonly,
  onViewClick,
  onEditClick,
}: Props) => {
  if (isSelected) return null;
  return (
    <div className="flex items-center gap-2">
      <TooltipWrapper tooltipText="View workflow">
        <EyeIcon
          role="button"
          data-testid="view-flow"
          className="h-4 w-4 text-neutral-400 hover:text-foreground"
          onClick={(event) => {
            event.stopPropagation();
            onViewClick(item);
          }}
        />
      </TooltipWrapper>

      {!readonly && (
        <TooltipWrapper tooltipText="Edit workflow">
          <Pencil
            role="button"
            data-testid="edit-flow"
            className="h-4 w-4 text-neutral-400 hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onEditClick(item);
            }}
          />
        </TooltipWrapper>
      )}
    </div>
  );
};

FileAddons.displayName = 'FileAddons';

export { FileAddons };
