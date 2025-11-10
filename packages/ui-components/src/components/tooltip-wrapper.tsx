import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

type Props = {
  tooltipText: string | null | undefined;
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
  delayDuration?: number;
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
  children: React.ReactNode;
};

const TooltipWrapper = ({
  tooltipText,
  tooltipPlacement,
  align,
  alignOffset,
  children,
  delayDuration,
}: Props) => {
  if (!tooltipText) {
    return children;
  }
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        avoidCollisions
        hideWhenDetached
        side={tooltipPlacement}
        align={align}
        alignOffset={alignOffset}
      >
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
};

TooltipWrapper.displayName = 'TooltipWrapper';
export { TooltipWrapper };
