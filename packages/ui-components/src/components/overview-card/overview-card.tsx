import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type OverviewCardProps = {
  title: string;
  icon: ReactNode;
  value: string | number;
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
    <p className="font-bold text-[32px]/[32px] text-foreground">{value}</p>
    {bottomLineText && (
      <p className="font-normal text-sm text-gray-400">{bottomLineText}</p>
    )}
  </div>
);

OverviewCard.displayName = 'OverviewCard';
export { OverviewCard };
