import { Circle, LucideProps } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/cn';

import { TooltipWrapper } from '../tooltip-wrapper';

type MenuFooterNavigationItemProps = {
  to: string;
  label: string;
  Icon: React.ComponentType<LucideProps>;
  className?: string;
  iconClassName?: string;
  notificationIconClassName?: string;
  hasNotification: boolean;
};

const MenuFooterNavigationItem = ({
  to,
  label,
  Icon,
  notificationIconClassName,
  hasNotification,
  className,
  iconClassName,
}: MenuFooterNavigationItemProps) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <TooltipWrapper
      tooltipText={label}
      tooltipPlacement={hasNotification ? 'top' : 'right'}
    >
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
          {hasNotification && (
            <Circle
              className={cn(
                'absolute top-[-7px] right-[-6px] w-2 h-2 stroke-red-500 fill-red-500',
                notificationIconClassName,
              )}
            />
          )}
        </div>
      </Link>
    </TooltipWrapper>
  );
};

MenuFooterNavigationItem.displayName = 'MenuFooterNavigationItem';
export { MenuFooterNavigationItem };
