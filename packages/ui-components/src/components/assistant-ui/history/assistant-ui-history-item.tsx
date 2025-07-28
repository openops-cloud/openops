import { t } from 'i18next';
import { Check, Pencil, X } from 'lucide-react';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { cn } from '../../../lib/cn';
import { OverflowTooltip } from '../../overflow-tooltip';
import { TooltipWrapper } from '../../tooltip-wrapper';

type AssistantUiHistoryItemProps = {
  displayName: string;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename?: (newName: string) => void;
};

const ICON_CLASS_NAME =
  'text-primary cursor-pointer hover:bg-gray-300 rounded-xs';

const AssistantUiHistoryItem = ({
  displayName,
  isActive,
  onClick,
  onDelete,
  onRename,
}: AssistantUiHistoryItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(displayName);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleRename = () => {
    if (editedName.trim() && editedName !== displayName && onRename) {
      onRename(editedName);
    } else {
      setEditedName(displayName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditedName(displayName);
      setIsEditing(false);
    }
  };

  const handleContainerKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      ref={containerRef}
      aria-selected={isActive}
      role="option"
      tabIndex={isEditing ? -1 : 0}
      className={cn(
        'flex justify-between items-center gap-2 py-[9px] pl-[9px] pr-2 rounded-sm overflow-hidden cursor-pointer hover:bg-input hover:dark:bg-muted-foreground/80 group',
        {
          'bg-input': isActive,
        },
      )}
      onClick={isEditing ? undefined : onClick}
      onKeyDown={handleContainerKeyDown}
    >
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRename}
            className="flex-1 bg-transparent border-none outline-none focus:ring-0 font-normal dark:text-primary text-sm leading-snug"
            autoFocus
          />
          <TooltipWrapper tooltipText={t('Confirm')}>
            <Check
              role="button"
              size={13}
              className={ICON_CLASS_NAME}
              onClick={(event) => {
                event.stopPropagation();
                handleRename();
              }}
            />
          </TooltipWrapper>
          <TooltipWrapper tooltipText={t('Cancel')}>
            <X
              role="button"
              size={13}
              className={ICON_CLASS_NAME}
              onClick={(event) => {
                event.stopPropagation();
                setEditedName(displayName);
                setIsEditing(false);
              }}
            />
          </TooltipWrapper>
        </div>
      ) : (
        <OverflowTooltip
          text={displayName}
          className="flex-1 font-normal dark:text-primary text-sm leading-snug truncate select-none"
        />
      )}
      {!isEditing && (
        <div
          className={cn(
            'gap-2 items-center justify-center hidden group-hover:flex',
          )}
        >
          {onRename && (
            <TooltipWrapper tooltipText={t('Rename')}>
              <Pencil
                role="button"
                size={13}
                className={ICON_CLASS_NAME}
                onClick={(event) => {
                  event.stopPropagation();
                  setEditedName(displayName);
                  setIsEditing(true);
                }}
              />
            </TooltipWrapper>
          )}

          <TooltipWrapper tooltipText={t('Delete')}>
            <X
              role="button"
              size={13}
              className={ICON_CLASS_NAME}
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
            />
          </TooltipWrapper>
        </div>
      )}
    </div>
  );
};

AssistantUiHistoryItem.displayName = 'AssistantUiHistoryItem';
export { AssistantUiHistoryItem };
