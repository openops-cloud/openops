import { t } from 'i18next';
import { LogOut } from 'lucide-react';

import { AvatarImage } from '@radix-ui/react-avatar';
import { cn } from '../lib/cn';
import { Avatar, AvatarFallback } from './avatar';
import { AvatarLetter } from './avatar-letter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Separator } from './seperator';
import { TextWithIcon } from './text-with-icon';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

type User = {
  email: string;
};

type OpenOpsCloudUser = {
  email: string;
};

export type OpenOpsCloudConfig = {
  isCloudLoginEnabled: boolean;
  user?: OpenOpsCloudUser;
  onCloudLogin: () => void;
  logoUrl: string;
};

type UserAvatarDropdownMenuContentProps = {
  user: OpenOpsCloudUser | null;
  onLogout: () => void;
  cloudConfig: OpenOpsCloudConfig;
};

const UserAvatarDropdownMenuContent = ({
  user,
  onLogout,
  cloudConfig,
}: UserAvatarDropdownMenuContentProps) => {
  if (!user) {
    return null;
  }

  return (
    <DropdownMenuContent
      align="end"
      className="w-[308px] grid grid-cols-[auto,75px] rounded-sm py-4 px-3"
    >
      <DropdownMenuLabel className="flex-1 truncate">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback>
              <AvatarLetter
                email={user.email}
                disablePopup={true}
              ></AvatarLetter>
            </AvatarFallback>
          </Avatar>
          <div className="flex-grow flex-shrink truncate font-medium">
            {user.email}
          </div>
        </div>
      </DropdownMenuLabel>

      <DropdownMenuItem onClick={onLogout} className="cursor-pointer ml-1 ">
        <TextWithIcon
          icon={<LogOut size={16} className="text-primary-900" />}
          text={
            <span className="text-primary-900 text-[10px]">{t('Logout')}</span>
          }
          className="cursor-pointer gap-1"
        />
      </DropdownMenuItem>

      {cloudConfig.isCloudLoginEnabled && (
        <>
          <Separator
            orientation="horizontal"
            className="col-span-2 my-[9.5px]"
          />
          <DropdownMenuLabel className="flex-1 truncate">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage
                  src={cloudConfig.logoUrl}
                  height="20px"
                  className="h-6 w-6"
                />
                <AvatarFallback>OpenOps</AvatarFallback>
              </Avatar>
              <div className="truncate">
                <div className="flex-grow flex-shrink font-medium">
                  {t('OpenOps cloud')}
                </div>
                {cloudConfig.user && (
                  <span className="text-primary-900 text-xs font-light italic">
                    {t('Signed in as ')}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-pointer">
                          {cloudConfig.user?.email}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {cloudConfig.user?.email}
                      </TooltipContent>
                    </Tooltip>
                  </span>
                )}
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuItem
            onClick={cloudConfig.onCloudLogin}
            className={cn('cursor-pointer ml-1 h-9', {
              'w-fit': !cloudConfig.user,
              'ml-6': !cloudConfig.user,
            })}
          >
            {cloudConfig.user && (
              <TextWithIcon
                icon={<LogOut size={16} className="text-primary-900" />}
                text={
                  <span className="text-primary-900 text-[10px]">
                    {t('Logout')}
                  </span>
                }
                className="cursor-pointer gap-1"
              />
            )}
            {!cloudConfig.user && (
              <span className="text-indigo-500 font-bold text-[10px]">
                {t('Sign in')}
              </span>
            )}
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  );
};

UserAvatarDropdownMenuContent.displayName = 'UserAvatarDropdownMenuContent';

type UserAvatarMenuProps = {
  user?: User;
  MenuContent: JSX.Element;
};

const UserAvatarMenu = ({ user, MenuContent }: UserAvatarMenuProps) => {
  if (!user) {
    return null;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer h-9 w-9 " data-testid="user-avatar">
          <AvatarFallback>
            <AvatarLetter email={user.email} disablePopup={true}></AvatarLetter>
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      {MenuContent}
    </DropdownMenu>
  );
};

UserAvatarMenu.displayName = 'UserAvatarMenu';

export {
  UserAvatarDropdownMenuContent,
  UserAvatarDropdownMenuContentProps,
  UserAvatarMenu,
  UserAvatarMenuProps,
};
