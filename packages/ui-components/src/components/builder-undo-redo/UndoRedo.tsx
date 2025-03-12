import { Redo2 as RedoIcon, Undo2 as UndoIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Button, ButtonProps } from '../../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip';

import { t } from 'i18next';

type UndoRedoContainerProps = {
  children: React.ReactNode;
  className?: string;
};

const isMac = /(Mac)/i.test(navigator.userAgent);
const undoShortcutLabel = isMac ? '⌘ + Z' : 'CTRL + Z';
const redoShortcutLabel = isMac ? '⌘ + ⇧ + Z' : 'CTRL + ⇧ + Z';

/**
 * Container component for undo/redo buttons with a white background and rounded corners
 * @example
 * <UndoRedoContainer>
 *   <UndoButton />
 *   <UndoRedoDevider />
 *   <RedoButton />
 * </UndoRedoContainer>
 */
const UndoRedoContainer = ({ children, className }: UndoRedoContainerProps) => {
  return (
    <div
      className={cn(
        'w-[78px] h-[42px] p-1 bg-background rounded-xl shadow-editor justify-between inline-flex items-center',
        className,
      )}
    >
      {children}
    </div>
  );
};
UndoRedoContainer.displayName = 'UndoRedoContainer';

/**
 * Vertical divider line component for separating undo/redo buttons
 * @example
 * <UndoRedoDevider />
 */
const UndoRedoDevider = () => (
  <div className="h-[26px] opacity-50 border-[0.5px] border-border"></div>
);
UndoRedoDevider.displayName = 'UndoRedoDevider';

/**
 * Props interface for undo/redo button components
 * Extends ButtonProps and adds optional tooltip content
 */
type UndoRedoProps = Omit<ButtonProps, 'children'> & {
  tooltipContent?: ReactNode;
  Icon: React.ComponentType<{ className?: string }>;
};

const UndoRedoButton = ({
  Icon,
  tooltipContent,
  disabled,
  ...props
}: UndoRedoProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={cn('py-0', {
            'opacity-100': disabled,
          })}
          size="icon"
          variant="basic"
          disabled={disabled}
          {...props}
        >
          <Icon
            className={cn('size-5', {
              'text-border-300': disabled,
              'opacity-100': disabled,
              'cursor-not-allowed': disabled,
            })}
          />
        </Button>
      </TooltipTrigger>
      {!!tooltipContent && (
        <TooltipContent className="mt-1" side="bottom">
          {tooltipContent}
        </TooltipContent>
      )}
    </Tooltip>
  </TooltipProvider>
);

/**
 * Undo component with tooltip showing keyboard shortcut
 * @example
 * <Undo onClick={handleUndo} disabled={!canUndo} />
 */
const Undo = ({ children, ...props }: ButtonProps) => (
  <UndoRedoButton
    Icon={UndoIcon}
    aria-label="Undo"
    tooltipContent={t('Undo ') + `(${undoShortcutLabel})`}
    {...props}
  />
);
Undo.displayName = 'Undo';

/**
 * Redo component with tooltip showing keyboard shortcut
 * @example
 * <Redo onClick={handleRedo} disabled={!canRedo} />
 */
const Redo = ({ children, ...props }: ButtonProps) => (
  <UndoRedoButton
    Icon={RedoIcon}
    aria-label="Redo"
    tooltipContent={t('Redo ') + `(${redoShortcutLabel})`}
    {...props}
  />
);
Redo.displayName = 'Redo';

export { Redo, Undo, UndoRedoContainer, UndoRedoDevider };
export type { UndoRedoContainerProps, UndoRedoProps };
