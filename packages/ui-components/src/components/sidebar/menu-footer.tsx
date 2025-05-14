import { AuthenticationResponse } from '@openops/shared';
import { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import {
  OpenOpsCloudConfig,
  UserAvatarDropdownMenuContent,
  UserAvatarMenu,
} from '../../ui/user-avatar-menu';
import { MenuNavigationItem } from './menu-navigation-item';
import { MenuLink } from './types';

export type MenuFooterProps = {
  settingsLink: MenuLink;
  user: AuthenticationResponse | null;
  onLogout: () => void;
  isMinimized: boolean;
  cloudConfig: OpenOpsCloudConfig;
  children?: ReactNode;
};

const MenuFooter = ({
  settingsLink,
  user,
  onLogout,
  isMinimized,
  cloudConfig,
  children,
}: MenuFooterProps) => {
  return (
    <>
      {isMinimized && (
        <div className="w-full flex justify-center items-center mb-4">
          {children}
        </div>
      )}
      <div className="w-full flex justify-between items-center p-4 border-t flex-col gap-1  @[180px]:py-4 @[180px]:flex-row @[180px]:h-[64px]">
        <div
          className={cn('flex items-center gap-2', {
            'flex-col-reverse': isMinimized,
          })}
        >
          <UserAvatarMenu
            user={
              user
                ? {
                    email: user.email ?? '',
                  }
                : undefined
            }
            MenuContent={
              <UserAvatarDropdownMenuContent
                cloudConfig={cloudConfig}
                onLogout={onLogout}
                user={user}
              />
            }
          />

          <MenuNavigationItem
            to={settingsLink.to}
            label={settingsLink.label}
            Icon={settingsLink.icon}
            iconClassName="size-6"
            className="ml-0 h-9"
            isMinimized={true}
          ></MenuNavigationItem>
        </div>
        {!isMinimized && children}
      </div>
    </>
  );
};

MenuFooter.displayName = 'MenuFooter';
export { MenuFooter };
