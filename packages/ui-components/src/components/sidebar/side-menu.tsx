import React from 'react';

import { cn } from '../../lib/cn';

type SideMenuProps = {
  children: React.ReactNode;
  MenuHeader: React.ReactNode;
  MenuFooter: React.ReactNode;
  className?: string;
};

const SideMenu = ({
  children,
  MenuHeader,
  MenuFooter,
  className,
}: SideMenuProps) => {
  return (
    <div className={cn('border-r top-0 bg-background @container', className)}>
      <div className="flex flex-col h-screen justify-between">
        <div className="flex flex-col flex-1 overflow-hidden">
          {MenuHeader}
          {children}
        </div>
        {MenuFooter}
      </div>
    </div>
  );
};

SideMenu.displayName = 'SideMenu';
export { SideMenu };
