import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type OverviewCardProps = {
  title: string;
  icon: ReactNode;
  value: ReactNode;
  /** Rendered baseline-aligned to the right of the value (e.g. secondary currency amounts). */
  secondaryValue?: ReactNode;
  bottomLineText?: string;
  onClick?: () => void;
  iconWrapperClassName?: string;
  titleClassName?: string;
  className?: string;
};

const OverviewCard = ({
  title,
  icon,
  value,
  secondaryValue,
  bottomLineText,
  onClick,
  iconWrapperClassName,
  titleClassName,
  className,
}: OverviewCardProps) => (
  <div
    className={cn(
      'w-full h-full p-[22px] flex flex-col gap-4 bg-background border rounded-2xl shadow-template',
      { 'cursor-pointer': !!onClick },
      className,
    )}
    onClick={onClick}
  >
    <div className="flex items-center gap-[9px]">
      <div
        className={cn(
          'size-10 shrink-0 flex items-center justify-center rounded-full font-bold text-base text-background bg-blue-400',
          iconWrapperClassName,
        )}
      >
        {icon}
      </div>
      <span
        className={cn('text-[14px] font-bold text-foreground', titleClassName)}
      >
        {title}
      </span>
    </div>
    <div className="flex items-baseline gap-2 flex-wrap">
      {/* div, not p: value is a ReactNode and may legally contain non-phrasing content */}
      <div className="font-bold text-[32px]/[32px] text-foreground">
        {value}
      </div>
      {secondaryValue}
    </div>
    {bottomLineText && (
      <p className="font-normal text-sm text-gray-400">{bottomLineText}</p>
    )}
  </div>
);

OverviewCard.displayName = 'OverviewCard';
export { OverviewCard };
