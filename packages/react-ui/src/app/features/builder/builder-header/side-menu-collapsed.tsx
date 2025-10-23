import { ReactNode } from 'react';

type SideMenuCollapsedProps = {
  children: ReactNode;
};

const SideMenuCollapsed = ({ children }: SideMenuCollapsedProps) => {
  return (
    <div className="[min-w-100px] flex items-center justify-start bg-background h-[42px] rounded-xl shadow-editor overflow-hidden p-3 pr-0">
      {children}
    </div>
  );
};

SideMenuCollapsed.displayName = 'SideMenuCollapsed';

export { SideMenuCollapsed };
