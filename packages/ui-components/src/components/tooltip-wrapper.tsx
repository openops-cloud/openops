import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

type Props = {
  tooltipText: string;
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
  delayDuration?: number;
  children: React.ReactNode;
};

const TooltipWrapper = ({
  tooltipText,
  tooltipPlacement,
  children,
  delayDuration,
}: Props) => {
  if (!tooltipText) {
    return children;
  }
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent avoidCollisions hideWhenDetached side={tooltipPlacement}>
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
};

TooltipWrapper.displayName = 'TooltipWrapper';
export { TooltipWrapper };
