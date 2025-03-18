import { useKeyPress } from '@xyflow/react';
import { t } from 'i18next';
import { Hand, MousePointer } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../ui/tooltip';

import { useCanvasContext } from '../canvas-context';

export const PanningModeControls = () => {
  const { panningMode, setPanningMode } = useCanvasContext();
  const spacePressed = useKeyPress('Space');
  const shiftPressed = useKeyPress('Shift');
  const isInGrabMode =
    (spacePressed || panningMode === 'grab') && !shiftPressed;

  return (
    <div className="bg-background absolute left-[10px] bottom-[60px] z-50 rounded-xl shadow-editor flex flex-col gap-1 px-0.5 py-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isInGrabMode ? 'ghost' : 'ghostActive'}
            size="sm"
            onClick={() => {
              if (!spacePressed) {
                setPanningMode('pan');
              }
            }}
            className="relative h-9 w-9 px-0 focus:outline-0"
          >
            <MousePointer className="w-5 h-5 dark:text-primary"></MousePointer>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{t('Select Mode')}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isInGrabMode ? 'ghostActive' : 'ghost'}
            size="sm"
            onClick={() => {
              if (!spacePressed) {
                setPanningMode('grab');
              }
            }}
            className="relative h-9 w-9 px-0 focus:outline-0"
          >
            <Hand className="w-5 h-5 dark:text-primary"></Hand>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{t('Move Mode')}</TooltipContent>
      </Tooltip>
    </div>
  );
};
