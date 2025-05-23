import { t } from 'i18next';
import { Circle, LucideProps } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip';
import { TooltipWrapper } from '../tooltip-wrapper';

type MenuNavigationItemProps = {
  to: string;
  label: string;
  isMinimized: boolean;
  Icon: React.ComponentType<LucideProps>;
  notificationLabel?: string;
  notificationIconClassName?: string;
  className?: string;
  iconClassName?: string;
  isComingSoon?: boolean;
};

const MenuNavigationItem = ({
  to,
  label,
  isMinimized,
  Icon,
  notificationLabel,
  notificationIconClassName,
  className,
  iconClassName,
  isComingSoon,
}: MenuNavigationItemProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Wrapper isMinimized={isMinimized} label={label}>
      <Link
        to={to}
        className={cn(
          'flex items-center gap-3 py-2 px-2 hover:bg-accent w-fit ml-1 rounded-sm @[180px]:w-full @[180px]:m-0 @[180px]:rounded-lg @[180px]:py-1 @[180px]:px-3',
          { 'bg-blueAccent/10': isActive },
          className,
        )}
      >
        <div className="relative">
          <Icon
            className={cn(
              'size-[18px] transition-colors',
              {
                'text-primary': isActive,
                'text-primary-400 dark:text-gray-100': !isActive,
              },
              iconClassName,
            )}
            strokeWidth={isActive ? 2.7 : 2.3}
          />
          {notificationLabel && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Circle
                    className={cn(
                      'absolute top-[-7px] right-[-6px] w-2 h-2 stroke-red-500 fill-red-500',
                      notificationIconClassName,
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent>{notificationLabel}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {!isMinimized && (
          <>
            <span
              className={cn('text-[16px] font-normal', {
                'font-black text-primary': isActive,
                'text-primary/90': !isActive,
              })}
            >
              {label}
            </span>
            {isComingSoon && (
              <div className="w-[86px] h-[19px] relative">
                <div className="w-[86px] h-[19px] left-[-5px] top-0 absolute bg-gray-200 dark:text-gray-400 rounded" />
                <span className="text-primary-900 left-[2px] top-[1.5px] absolute text-xs font-medium dark:text-background">
                  {t('Coming soon')}
                </span>
              </div>
            )}
          </>
        )}
      </Link>
    </Wrapper>
  );
};

const Wrapper = ({
  children,
  isMinimized,
  label,
}: {
  children: React.ReactNode;
  isMinimized: boolean;
  label: string;
}) => {
  if (isMinimized) {
    return (
      <TooltipWrapper tooltipText={label} tooltipPlacement="right">
        {children}
      </TooltipWrapper>
    );
  } else {
    return children;
  }
};

MenuNavigationItem.displayName = 'MenuNavigationItem';
export { MenuNavigationItem };
