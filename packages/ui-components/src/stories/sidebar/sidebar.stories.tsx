import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent } from '@storybook/testing-library';
import { Bot, Home, LucideBarChart2, Workflow, Wrench } from 'lucide-react';
import { BrowserRouter } from 'react-router-dom';
import {
  MenuFooter,
  SideMenu,
  SideMenuHeader,
  SideMenuNavigation,
} from '../../components';
import { cn } from '../../lib/cn';
import { selectLightOrDarkCanvas } from '../../test-utils/select-themed-canvas.util';
import { Button } from '../../ui/button';
import { TooltipProvider } from '../../ui/tooltip';

const HeaderWrapper = ({
  theme,
  isMinimized = false,
}: {
  theme?: string;
  isMinimized?: boolean;
}) => {
  let logoSrc;
  if (isMinimized) {
    logoSrc =
      theme === 'Dark'
        ? 'https://static.openops.com/logos/logo.icon.svg'
        : 'https://static.openops.com/logos/logo.icon.positive.svg';
  } else {
    logoSrc =
      theme === 'Dark'
        ? 'https://static.openops.com/logos/logo.svg'
        : 'https://static.openops.com/logos/logo.positive.svg';
  }

  return (
    <SideMenuHeader
      className="justify-start"
      logo={
        <div className="h-6">
          <img className="h-full" alt="logo" src={logoSrc} />
        </div>
      }
    />
  );
};

const footerWrapperProps = {
  isMinimized: false,
  cloudConfig: {
    isCloudLoginEnabled: true,
    logout: () => {},
    logoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
  },
  settingsLink: {
    to: '/settings',
    label: 'Settings',
    icon: Wrench,
  },
  user: {
    email: 'cezar@openops.com',
  },
  onLogout: () => {},
};

const FooterWrapperConnectedToCloud = () => (
  <MenuFooter
    {...footerWrapperProps}
    cloudConfig={{
      ...footerWrapperProps.cloudConfig,
      user: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@acme.com',
      },
    }}
  />
);

const AiFooter =
  ({ isMinimized }: { isMinimized: boolean }) =>
  // eslint-disable-next-line react/display-name
  () =>
    (
      <MenuFooter
        {...footerWrapperProps}
        cloudConfig={{
          ...footerWrapperProps.cloudConfig,
          user: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@acme.com',
          },
        }}
        isMinimized={isMinimized}
      >
        <Button
          variant="ai"
          className={'size-9 p-0 gap-2'}
          onClick={() => action('AI button clicked')}
        >
          <Bot className="w-6 h-6 dark:text-primary" />
        </Button>
      </MenuFooter>
    );

const FooterWrapperNotConnectedToCloud = () => (
  <MenuFooter {...footerWrapperProps} />
);

const SidebarWrapper = ({
  isMinimized,
  theme,
  isFullCatalog,
  isAiEnabled,
  className,
}: {
  isMinimized: boolean;
  theme?: string;
  isFullCatalog: boolean;
  isAiEnabled: boolean;
  className?: string;
}) => {
  const footer = isAiEnabled
    ? AiFooter({ isMinimized })
    : isFullCatalog
    ? FooterWrapperConnectedToCloud
    : FooterWrapperNotConnectedToCloud;

  return (
    <BrowserRouter>
      <TooltipProvider>
        <div className="border-l border-t border-b w-full">
          <SideMenu
            MenuHeader={() => (
              <HeaderWrapper theme={theme} isMinimized={isMinimized} />
            )}
            MenuFooter={footer}
            className={cn('w-[300px]', className)}
          >
            <SideMenuNavigation links={MENU_LINKS} isMinimized={isMinimized} />
          </SideMenu>
        </div>
      </TooltipProvider>
    </BrowserRouter>
  );
};

const MENU_LINKS = [
  {
    to: '/',
    label: 'Overview',
    icon: Home,
  },
  {
    to: '/flows',
    label: 'Workflows',
    icon: Workflow,
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: LucideBarChart2,
    isComingSoon: true,
  },
];

const meta = {
  title: 'components/Sidebar',
  component: SidebarWrapper,
} satisfies Meta<typeof SidebarWrapper>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isMinimized: false,
    isFullCatalog: false,
  },
  render: (args, context) => (
    <SidebarWrapper {...args} theme={context?.globals?.theme} />
  ),
};

/**
 * Displays the Avatar profile menu opened with connected to Cloud Indicator.
 */
export const WithNotConnectedCloudIndicator: Story = {
  ...Default,
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    const avatarMenuTriggerEl = await canvas.findByTestId('user-avatar');
    await userEvent.click(avatarMenuTriggerEl);
  },
};

/**
 * Displays the Avatar profile menu opened without connected to Cloud Indicator.
 */
export const WithConnectedCloudIndicator: Story = {
  args: {
    ...Default.args,
    isFullCatalog: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    const avatarMenuTriggerEl = await canvas.findByTestId('user-avatar');
    await userEvent.click(avatarMenuTriggerEl);
  },
};

/**
 * Displays the AI button inside the footer .
 */
export const WithAiFeatureEnabled: Story = {
  args: {
    ...Default.args,
    isFullCatalog: true,
    isAiEnabled: true,
  },
};

/**
 * Displays the AI button inside the footer in minimized view.
 */
export const WithAiFeatureEnabledMinimized: Story = {
  args: {
    ...Default.args,
    isMinimized: true,
    isAiEnabled: true,
    className: 'w-[69px]',
  },
};
