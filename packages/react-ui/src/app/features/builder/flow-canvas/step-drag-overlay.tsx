import { t } from 'i18next';

import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import { Action, Trigger } from '@openops/shared';

type StepDragTemplateProps = {
  step: Action | Trigger;
  cursorPosition: { x: number; y: number };
  lefSideBarContainerWidth: number;
};

const STEP_DRAG_OVERLAY_SIZE = 100;

const StepDragOverlay = ({
  step,
  lefSideBarContainerWidth,
  cursorPosition,
}: StepDragTemplateProps) => {
  const { stepMetadata } = blocksHooks.useStepMetadata({
    step: step!,
  });

  const left = `${
    cursorPosition.x - STEP_DRAG_OVERLAY_SIZE / 2 - lefSideBarContainerWidth
  }px`;
  const top = `${cursorPosition.y - STEP_DRAG_OVERLAY_SIZE / 2}px`;

  return (
    <div
      className={
        'p-4 absolute left-0 top-0 opacity-75 flex items-center justify-center rounded-lg border border-solid bg-white'
      }
      style={{
        left,
        top,
        height: `${STEP_DRAG_OVERLAY_SIZE}px`,
        width: `${STEP_DRAG_OVERLAY_SIZE}px`,
      }}
    >
      <img
        id={t('logo')}
        className={'object-contain left-0 right-0 static'}
        src={stepMetadata?.logoUrl}
        alt={t('Step Icon')}
      />
    </div>
  );
};

export default StepDragOverlay;
