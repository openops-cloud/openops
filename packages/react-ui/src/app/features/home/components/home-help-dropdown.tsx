import { userSettingsHooks } from '@/app/common/hooks/user-settings-hooks';
import { useAppStore } from '@/app/store/app-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TooltipWrapper,
} from '@openops/components/ui';
import { t } from 'i18next';
import { CircleHelp } from 'lucide-react';
import { Link } from 'react-router-dom';

const HomeHelpDropdown = () => {
  const { updateUserSettings } = userSettingsHooks.useUpdateUserSettings();
  const { isHelpViewClosed } = useAppStore((state) => ({
    isHelpViewClosed: state.userSettings.isHelpViewClosed,
  }));

  return (
    <DropdownMenu modal={true}>
      <TooltipWrapper tooltipText={t('Help')} tooltipPlacement="top">
        <DropdownMenuTrigger asChild>
          <div className="h-10 flex items-center">
            <CircleHelp className="size-6" role="button" />
          </div>
        </DropdownMenuTrigger>
      </TooltipWrapper>
      <DropdownMenuContent>
        <DropdownMenuItem
          disabled={!isHelpViewClosed}
          onSelect={(e) => {
            updateUserSettings({ isHelpViewClosed: false });
          }}
        >
          {t('Get started')}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="https://docs.openops.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('Documentation')}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

HomeHelpDropdown.displayName = 'HomeHelpDropdown';
export { HomeHelpDropdown };
