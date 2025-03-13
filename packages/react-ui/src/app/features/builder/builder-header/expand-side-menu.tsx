import { Button, TooltipWrapper } from '@openops/components/ui';
import { t } from 'i18next';
import { PanelLeft } from 'lucide-react';
import React from 'react';

type ExpandSideMenuProps = {
  isSideMenuCollapsed: boolean;
  handleCollasedClick: () => void;
};

const ExpandSideMenu = ({
  isSideMenuCollapsed,
  handleCollasedClick,
}: ExpandSideMenuProps) => {
  if (!isSideMenuCollapsed) {
    return null;
  }

  return (
    <div className="bg-background shadow-editor flex items-center justify-center rounded-lg z-50 p-1 h-[42px]">
      <TooltipWrapper tooltipText={t('Menu')} tooltipPlacement="bottom">
        <Button
          variant={'ghost'}
          className="p-0 h-[34px] min-w-[34px]"
          aria-label="Menu"
          onClick={handleCollasedClick}
        >
          <PanelLeft size={24} />
        </Button>
      </TooltipWrapper>
    </div>
  );
};

ExpandSideMenu.displayName = 'ExpandSideMenu';
export { ExpandSideMenu };
