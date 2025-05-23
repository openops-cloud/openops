import { AuthenticationResponse } from '@openops/shared';
import { t } from 'i18next';
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
  hasNewerAvailableVersion?: boolean;
  currentVersion?: string;
  children?: ReactNode;
};

const MenuFooter = ({
  settingsLink,
  user,
  onLogout,
  isMinimized,
  cloudConfig,
  hasNewerAvailableVersion,
  currentVersion,
  children,
}: MenuFooterProps) => {
  const newerVersionNotification = hasNewerAvailableVersion
    ? t(
        'Current version: {currentVersion}. Newer version is available, go to settings to update',
        {
          currentVersion,
        },
      )
    : undefined;
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
            notificationLabel={newerVersionNotification}
            iconClassName="size-[21px]"
            className="flex items-center justify-center ml-0 p-0 @[180px]:p-0 size-9 @[180px]:size-9 rounded-full @[180px]:rounded-full bg-accent dark:bg-accent hover:bg-input dark:hover:bg-accent/70"
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
