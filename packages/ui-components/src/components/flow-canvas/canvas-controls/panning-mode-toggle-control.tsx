import { useKeyPress } from '@xyflow/react';
import { t } from 'i18next';
import { MousePointer } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../ui/tooltip';

import { PanningMode, useCanvasContext } from '../canvas-context';
import { SHIFT_KEY, SPACE_KEY } from '../constants';

const togglePanningMode = (
  currentMode: PanningMode,
  spacePressed: boolean,
  shiftPressed: boolean,
) => {
  if (
    (currentMode === 'pan' && spacePressed) ||
    (currentMode === 'grab' && shiftPressed)
  ) {
    return currentMode;
  }
  return currentMode === 'pan' ? 'grab' : 'pan';
};

export const PanningModeToggleControl = () => {
  const { panningMode, setPanningMode } = useCanvasContext();
  const spacePressed = useKeyPress(SPACE_KEY);
  const shiftPressed = useKeyPress(SHIFT_KEY);
  const isInGrabMode =
    (spacePressed || panningMode === 'grab') && !shiftPressed;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isInGrabMode ? 'ghost' : 'ghostActive'}
          size="sm"
          onClick={() =>
            setPanningMode((val) =>
              togglePanningMode(val, spacePressed, shiftPressed),
            )
          }
          className="relative h-9 w-9 px-0 focus:outline-0"
        >
          <MousePointer className="w-5 h-5 dark:text-primary"></MousePointer>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{t('Select Mode')}</TooltipContent>
    </Tooltip>
  );
};
